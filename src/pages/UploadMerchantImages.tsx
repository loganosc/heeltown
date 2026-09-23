import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, CheckCircle2, X, Loader2 } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

interface SelectedFile {
  file: File;
  preview: string;
  uploaded: boolean;
}

const UploadMerchantImages = () => {
  const { isAdmin, isLoading: adminLoading } = useRequireAdmin();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error("Some files were skipped (only images allowed)");
    }

    const newFiles = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploaded: false,
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImage = async (selectedFile: SelectedFile, index: number) => {
    try {
      const { error } = await supabase.storage
        .from("merchant-images")
        .upload(selectedFile.file.name, selectedFile.file, {
          upsert: true,
          contentType: selectedFile.file.type,
        });

      if (error) throw error;

      setSelectedFiles(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], uploaded: true };
        return updated;
      });
      return true;
    } catch (error) {
      console.error(`Error uploading ${selectedFile.file.name}:`, error);
      return false;
    }
  };

  const uploadAll = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select images to upload");
      return;
    }

    setUploading(true);
    let successCount = 0;
    
    for (let i = 0; i < selectedFiles.length; i++) {
      if (!selectedFiles[i].uploaded) {
        const success = await uploadImage(selectedFiles[i], i);
        if (success) successCount++;
      }
    }

    setUploading(false);
    
    if (successCount === selectedFiles.filter(f => !f.uploaded).length) {
      toast.success(`Successfully uploaded ${successCount} images!`);
    } else {
      toast.warning(`Uploaded ${successCount} of ${selectedFiles.filter(f => !f.uploaded).length} images`);
    }
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
      <div className="max-w-4xl mx-auto space-y-4">
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
            <CardTitle>Upload Merchant Images</CardTitle>
            <CardDescription>
              Select multiple images to upload to the merchant-images storage bucket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Upload className="mr-2 h-5 w-5" />
              Select Images
            </Button>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedFiles.map((selectedFile, index) => (
                    <div
                      key={index}
                      className="relative group rounded-lg overflow-hidden border bg-muted"
                    >
                      <img
                        src={selectedFile.preview}
                        alt={selectedFile.file.name}
                        className="w-full h-32 object-cover"
                      />
                      {selectedFile.uploaded && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="p-2">
                        <p className="text-xs truncate" title={selectedFile.file.name}>
                          {selectedFile.file.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={uploadAll}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full"
              size="lg"
            >
              {uploading ? "Uploading..." : `Upload ${selectedFiles.filter(f => !f.uploaded).length} Image${selectedFiles.filter(f => !f.uploaded).length !== 1 ? 's' : ''}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadMerchantImages;
