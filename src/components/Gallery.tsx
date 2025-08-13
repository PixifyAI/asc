import React from 'react';
import { Concept } from '../types/concept';
import { getImageFormats } from '../hooks/useConceptDetail';

interface GalleryProps {
  concepts: Concept[];
  onSelectConcept: (concept: Concept) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ concepts, onSelectConcept }) => {
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = React.useState<Record<string, string>>({});

  // Check for available image formats for each concept
  React.useEffect(() => {
    const checkImages = async () => {
      const newLoadedImages: Record<string, string> = {};
      
      for (const concept of concepts) {
        const baseName = concept.mainImage.replace(/\.[^/.]+$/, ''); // Remove extension
        // Only check common formats to reduce requests
        const possibleFormats = [`${baseName}.avif`, `${baseName}.png`, `${baseName}.jpg`, `${baseName}.jpeg`];
        
        for (const format of possibleFormats) {
          try {
            const response = await fetch(`/${concept.folder}/${format}`, { 
              method: 'HEAD',
              cache: 'no-cache'
            });
            if (response.ok) {
              newLoadedImages[concept.id] = format;
              break; // Use first available format
            }
          } catch (error) {
            // Continue to next format
          }
        }
        
        // Fallback to original mainImage if no formats found
        if (!newLoadedImages[concept.id]) {
          newLoadedImages[concept.id] = concept.mainImage;
        }
      }
      
      setLoadedImages(newLoadedImages);
    };
    
    if (concepts.length > 0) {
      checkImages();
    }
  }, [concepts]);

  const handleImageError = (conceptId: string) => {
    setImageErrors(prev => ({ ...prev, [conceptId]: true }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Animated Series Concepts
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Explore our collection of original animated series concepts, each with unique worlds, characters, and stories waiting to be brought to life.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              onClick={() => onSelectConcept(concept)}
              className="group cursor-pointer bg-gray-900 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:bg-gray-800"
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                {!imageErrors[concept.id] && loadedImages[concept.id] ? (
                  <img
                    src={`/${concept.folder}/${loadedImages[concept.id]}`}
                    alt={concept.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={() => handleImageError(concept.id)}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <div className="text-sm">Image not found</div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-500" />
              </div>
              
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors duration-300">
                  {concept.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  Click to explore this concept
                </p>
              </div>
            </div>
          ))}
        </div>

        {concepts.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-xl">No concepts found. Add some folders to the public directory!</p>
          </div>
        )}
      </div>
    </div>
  );
};