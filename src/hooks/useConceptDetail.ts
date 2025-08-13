import { useState, useEffect } from 'react';

export const useConceptDetail = (folder: string, textFile: string) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/${folder}/${textFile}`);
        if (!response.ok) {
          throw new Error(`Failed to load content: ${response.statusText}`);
        }
        
        const text = await response.text();
        setContent(text);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setLoading(false);
        setLoading(false);
      }
    };

    loadContent();
  }, [folder, textFile]);

  return { content, loading, error };
};

export const getImageFormats = (baseName: string) => {
  const extensions = ['avif', 'avifs', 'webp', 'png', 'jpg', 'jpeg', 'webm', 'apng', 'gif'];
  return extensions.map(ext => `${baseName}.${ext}`);
};