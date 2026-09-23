import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

const ManageMerchantImages = () => {
  const { isAdmin, isLoading: adminLoading } = useRequireAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ["merchants-manage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleImageUpload = async (merchantId: string, file: File) => {
    setUploadingId(merchantId);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("merchant-images")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Update merchant record
      const { error: updateError } = await supabase
        .from("merchants")
        .update({ cover_photo: fileName })
        .eq("id", merchantId);

      if (updateError) throw updateError;

      toast.success("Image uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["merchants-manage"] });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveImage = async (merchantId: string, currentImage: string) => {
    try {
      // Remove from storage
      if (currentImage) {
        await supabase.storage
          .from("merchant-images")
          .remove([currentImage]);
      }

      // Update merchant record
      const { error } = await supabase
        .from("merchants")
        .update({ cover_photo: null })
        .eq("id", merchantId);

      if (error) throw error;

      toast.success("Image removed successfully");
      queryClient.invalidateQueries({ queryKey: ["merchants-manage"] });
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove image");
    }
  };

  const getImageUrl = (coverPhoto: string | null) => {
    if (!coverPhoto) return null;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/merchant-images/${coverPhoto}`;
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Manage Merchant Images</CardTitle>
            <CardDescription>
              Upload or replace images for each merchant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading merchants...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {merchants.map((merchant) => (
                  <Card key={merchant.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      {merchant.cover_photo ? (
                        <>
                          <img
                            src={getImageUrl(merchant.cover_photo) || ''}
                            alt={merchant.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                            }}
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => handleRemoveImage(merchant.id, merchant.cover_photo)}
                            disabled={uploadingId === merchant.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-semibold text-lg">{merchant.name}</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`file-${merchant.id}`}>
                          {merchant.cover_photo ? 'Replace Image' : 'Upload Image'}
                        </Label>
                        <Input
                          id={`file-${merchant.id}`}
                          type="file"
                          accept="image/*"
                          disabled={uploadingId === merchant.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(merchant.id, file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>

                      {uploadingId === merchant.id && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Upload className="h-4 w-4 animate-pulse" />
                          Uploading...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageMerchantImages;
