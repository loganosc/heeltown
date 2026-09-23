import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, X, Upload, FileDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

export default function AdminMerchantAttributes() {
  const { isAdmin, isLoading: adminLoading } = useRequireAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("");
  const [newMerchantName, setNewMerchantName] = useState<string>("");
  const [newMerchantCoverPhoto, setNewMerchantCoverPhoto] = useState<string>("");
  const [csvPreview, setCsvPreview] = useState<Array<{ name: string; location?: string; image_url?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch merchants with their attributes
  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['merchants-with-attributes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          *,
          merchant_attributes_junction (
            attribute_id,
            merchant_attributes (
              id,
              name
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all attributes
  const { data: allAttributes } = useQuery({
    queryKey: ['merchant_attributes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchant_attributes')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data;
    },
  });

  // Add attribute to merchant
  const addAttributeMutation = useMutation({
    mutationFn: async ({ merchantId, attributeId }: { merchantId: string; attributeId: string }) => {
      const { error } = await supabase
        .from('merchant_attributes_junction')
        .insert({ merchant_id: merchantId, attribute_id: attributeId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants-with-attributes'] });
      toast.success('Attribute added successfully');
      setSelectedAttributeId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add attribute');
    },
  });

  // Remove attribute from merchant
  const removeAttributeMutation = useMutation({
    mutationFn: async ({ merchantId, attributeId }: { merchantId: string; attributeId: string }) => {
      const { error } = await supabase
        .from('merchant_attributes_junction')
        .delete()
        .eq('merchant_id', merchantId)
        .eq('attribute_id', attributeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants-with-attributes'] });
      toast.success('Attribute removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove attribute');
    },
  });

  // Create new merchant
  const createMerchantMutation = useMutation({
    mutationFn: async ({ name, cover_photo }: { name: string; cover_photo?: string }) => {
      const { error } = await supabase
        .from('merchants')
        .insert({ name, cover_photo: cover_photo || null });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants-with-attributes'] });
      toast.success('Merchant created successfully');
      setNewMerchantName('');
      setNewMerchantCoverPhoto('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create merchant');
    },
  });

  const handleCreateMerchant = () => {
    if (!newMerchantName.trim()) {
      toast.error('Please enter a merchant name');
      return;
    }
    createMerchantMutation.mutate({ 
      name: newMerchantName.trim(), 
      cover_photo: newMerchantCoverPhoto.trim() || undefined 
    });
  };

  const handleAddAttribute = () => {
    if (!selectedMerchantId || !selectedAttributeId) {
      toast.error('Please select both a merchant and an attribute');
      return;
    }
    addAttributeMutation.mutate({ merchantId: selectedMerchantId, attributeId: selectedAttributeId });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Array<{ name?: string; location?: string; address?: string; image_url?: string }>;
        const validData = data
          .filter((row) => row.name && row.name.trim())
          .map((row) => ({
            name: row.name!.trim(),
            location: (row.location || row.address)?.trim() || undefined,
            image_url: row.image_url?.trim() || undefined,
          }));

        if (validData.length === 0) {
          toast.error('No valid merchant data found in CSV');
          return;
        }

        setCsvPreview(validData);
        toast.success(`Found ${validData.length} merchants to import`);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const bulkImportMutation = useMutation({
    mutationFn: async (merchants: Array<{ name: string; location?: string; image_url?: string }>) => {
      // Fetch existing merchants to check for duplicates
      const { data: existingMerchants, error: fetchError } = await supabase
        .from('merchants')
        .select('name');
      
      if (fetchError) throw fetchError;

      // Create a Set of lowercase existing merchant names for case-insensitive comparison
      const existingNames = new Set(
        (existingMerchants || []).map(m => m.name.toLowerCase())
      );

      // Filter out duplicates
      const newMerchants = merchants.filter(
        m => !existingNames.has(m.name.toLowerCase())
      );

      const skippedCount = merchants.length - newMerchants.length;

      if (newMerchants.length === 0) {
        throw new Error('All merchants already exist in the database');
      }

      // Process merchants with images
      const merchantsToInsert = await Promise.all(
        newMerchants.map(async (merchant) => {
          let coverPhoto = null;

          if (merchant.image_url) {
            try {
              // Fetch image from URL
              const response = await fetch(merchant.image_url);
              if (!response.ok) throw new Error('Failed to fetch image');

              const blob = await response.blob();
              
              // Generate unique filename
              const fileExt = merchant.image_url.split('.').pop()?.split('?')[0] || 'jpg';
              const fileName = `${crypto.randomUUID()}.${fileExt}`;

              // Upload to Supabase storage
              const { error: uploadError } = await supabase.storage
                .from('merchant-images')
                .upload(fileName, blob, {
                  contentType: blob.type,
                  cacheControl: '3600',
                  upsert: false,
                });

              if (uploadError) throw uploadError;
              coverPhoto = fileName;
            } catch (error) {
              console.error(`Failed to upload image for ${merchant.name}:`, error);
              // Continue without image if upload fails
            }
          }

          return {
            name: merchant.name,
            location: merchant.location || null,
            cover_photo: coverPhoto,
          };
        })
      );

      // Insert merchants
      const { error } = await supabase
        .from('merchants')
        .insert(merchantsToInsert);
      
      if (error) throw error;

      return { imported: newMerchants.length, skipped: skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['merchants-with-attributes'] });
      const message = result.skipped > 0 
        ? `Imported ${result.imported} merchants, skipped ${result.skipped} duplicates`
        : `Successfully imported ${result.imported} merchants`;
      toast.success(message);
      setCsvPreview([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to import merchants');
    },
  });

  const handleBulkImport = () => {
    if (csvPreview.length === 0) {
      toast.error('No merchants to import');
      return;
    }
    bulkImportMutation.mutate(csvPreview);
  };

  const downloadCsvTemplate = () => {
    const csv = 'name,address,image_url\nExample Merchant,123 Main St,https://example.com/image.jpg\nAnother Merchant,456 Oak Ave,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merchant_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Merchants</h1>
            <p className="text-sm md:text-base text-muted-foreground">Create merchants and manage their attributes</p>
          </div>
        </div>

        {/* Create Merchant Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Create New Merchant</CardTitle>
            <CardDescription className="text-sm">Add a new merchant to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Merchant Name *</label>
                <Input
                  placeholder="Enter merchant name"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Cover Photo URL (optional)</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={newMerchantCoverPhoto}
                  onChange={(e) => setNewMerchantCoverPhoto(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleCreateMerchant}
              disabled={!newMerchantName.trim() || createMerchantMutation.isPending}
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Merchant
            </Button>
          </CardContent>
        </Card>

        {/* CSV Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Bulk Import from CSV</CardTitle>
            <CardDescription className="text-sm">Upload a CSV file to import multiple merchants at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-2">
              <Button
                variant="outline"
                onClick={downloadCsvTemplate}
                className="flex-1 md:flex-none"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="cursor-pointer"
                />
              </div>
            </div>

            {csvPreview.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Preview ({csvPreview.length} merchants)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCsvPreview([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Image URL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.map((merchant, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{merchant.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                              {merchant.location || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                              {merchant.image_url || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Button
                  onClick={handleBulkImport}
                  disabled={bulkImportMutation.isPending}
                  className="w-full md:w-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {bulkImportMutation.isPending ? 'Importing...' : `Import ${csvPreview.length} Merchants`}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              CSV format: name (required), address (optional), image_url (optional). Images will be downloaded and saved to storage. Duplicates will be skipped (case-insensitive).
            </p>
          </CardContent>
        </Card>

        {/* Add Attribute Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Add Attribute to Merchant</CardTitle>
            <CardDescription className="text-sm">Select a merchant and an attribute to associate them</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Merchant</label>
                <Select value={selectedMerchantId} onValueChange={setSelectedMerchantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants?.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Attribute</label>
                <Select value={selectedAttributeId} onValueChange={setSelectedAttributeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAttributes?.map((attr) => (
                      <SelectItem key={attr.id} value={attr.id}>
                        {attr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleAddAttribute}
              disabled={!selectedMerchantId || !selectedAttributeId || addAttributeMutation.isPending}
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </CardContent>
        </Card>

        {/* Merchants List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Current Merchant Attributes</h2>
          
          {merchantsLoading ? (
            <p className="text-muted-foreground">Loading merchants...</p>
          ) : merchants?.length === 0 ? (
            <p className="text-muted-foreground">No merchants found</p>
          ) : (
            <div className="grid gap-4">
              {merchants?.map((merchant) => (
                <Card key={merchant.id}>
                  <CardHeader>
                    <CardTitle className="text-xl">{merchant.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {merchant.merchant_attributes_junction?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No attributes assigned</p>
                      ) : (
                        merchant.merchant_attributes_junction?.map((junction: any) => (
                          <Badge 
                            key={junction.attribute_id} 
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {junction.merchant_attributes.name}
                            <button
                              onClick={() => removeAttributeMutation.mutate({
                                merchantId: merchant.id,
                                attributeId: junction.attribute_id
                              })}
                              className="ml-1 hover:text-destructive"
                              disabled={removeAttributeMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
