import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCw, Volume2, VolumeX, Play } from 'lucide-react';
import { Concept } from '../types/concept';
import { useConceptDetail, getImageFormats } from '../hooks/useConceptDetail';

interface ConceptDetailProps {
  concept: Concept;
  onBack: () => void;
}

export const ConceptDetail: React.FC<ConceptDetailProps> = ({ concept, onBack }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [imagesChecked, setImagesChecked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { content, loading, error } = useConceptDetail(concept.folder, concept.textFile);

  // Initialize audio support
  React.useEffect(() => {
    // Check for speech synthesis OR audio support
    const speechSupported = 'speechSynthesis' in window;
    const audioSupported = 'Audio' in window;
    setSpeechSupported(speechSupported || audioSupported);
  }, []);

  // Reset video error state when image changes
  React.useEffect(() => {
    setVideoLoadError(false);
  }, [currentImageIndex]);
  // Check which images actually exist in the folder
  React.useEffect(() => {
    const checkImages = async () => {
      const baseName = concept.textFile.replace('.txt', '');
      
      const existingImages: string[] = [];
      
      // Check for images sequentially, stop when we don't find one
      for (let i = 0; i < 10; i++) {
        const fileName = i === 0 ? baseName : `${baseName}${i + 1}`;
        const formats = getImageFormats(fileName);
        
        let found = false;
        for (const format of formats) {
          try {
            const response = await fetch(`/${concept.folder}/${format}`, { 
              method: 'HEAD',
              cache: 'no-cache'
            });
            if (response.ok) {
              existingImages.push(format);
              found = true;
              break;
            }
          } catch (error) {
            // Continue to next format
          }
        }
        
        // If we didn't find this number, stop looking for higher numbers
        if (!found) {
          break;
        }
      }
      
      setAvailableImages(existingImages);
      setImagesChecked(true);
    };
    
    checkImages();
  }, [concept.folder, concept.textFile]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % availableImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
    setZoom(1);
    setRotation(0);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setZoom(1);
    setRotation(0);
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const nextImageFullscreen = () => {
    setCurrentImageIndex((prev) => (prev + 1) % availableImages.length);
    setZoom(1);
    setRotation(0);
  };

  const prevImageFullscreen = () => {
    setCurrentImageIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length);
    setZoom(1);
    setRotation(0);
  };

  const handleTextToSpeech = () => {
    if (!content) return;

    // Always cancel any existing speech first
    window.speechSynthesis.cancel();

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      // Fallback beep if no speech synthesis
      setIsPlaying(true);
      tryAudioFallback('');
      return;
    }

    setIsPlaying(true);

    // Clean the text for speech
    const cleanText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\n\s*\n/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/[^\w\s.,!?;:-]/g, '')
      .trim();

    // Limit text length for mobile performance
    const textToSpeak = cleanText.length > 1000 ? cleanText.substring(0, 1000) + '...' : cleanText;

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Mobile-optimized settings
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Force English language
    utterance.lang = 'en-US';
    
    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
    };
    
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    utterance.onerror = (event) => {
      setIsPlaying(false);
      // If speech fails, play beep as feedback
      tryAudioFallback('');
    };

    // For mobile: ensure voices are loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Wait for voices to load on mobile
      window.speechSynthesis.onvoiceschanged = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        const englishVoice = availableVoices.find(voice => 
          voice.lang.startsWith('en') && !voice.name.includes('Google')
        );
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        window.speechSynthesis.speak(utterance);
      };
    } else {
      // Voices already loaded
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && !voice.name.includes('Google')
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  };

  const tryAudioFallback = (text: string) => {
    // Create a simple beep sound as audio feedback
    // This is a fallback when speech synthesis doesn't work
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setTimeout(() => {
        setIsPlaying(false);
      }, 500);
      
    } catch (error) {
      // If all else fails, just show visual feedback
      setTimeout(() => {
        setIsPlaying(false);
      }, 1000);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioElement]);

  const formatContent = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            {line.substring(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl font-semibold mb-4 mt-8 text-blue-400">
            {line.substring(3)}
          </h2>
        );
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return (
          <p key={index} className="text-gray-300 leading-relaxed mb-4">
            {line}
          </p>
        );
      }
    });
  };

  if (!imagesChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-300 mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span>Back to Gallery</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
            {/* Image Section */}
            <div className="space-y-6">
              {availableImages.length > 0 && (
                <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Check if current image is animated */}
                  {availableImages[currentImageIndex]?.match(/\.(avifs|webm|apng|gif)$/i) && !videoLoadError ? (
                    <video
                      onClick={openFullscreen}
                      src={`/${concept.folder}/${availableImages[currentImageIndex]}`}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        setVideoLoadError(true);
                      }}
                    />
                  ) : (
                    <img
                      onClick={openFullscreen}
                      src={`/${concept.folder}/${availableImages[currentImageIndex]}`}
                      alt={`${concept.title} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  )}
                  
                  {availableImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300 hover:scale-110"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-300 hover:scale-110"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Thumbnail Navigation */}
              {availableImages.length > 1 && (
                <div className="flex space-x-3 justify-center">
                  {availableImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                        currentImageIndex === index
                          ? 'border-blue-400 scale-105'
                          : 'border-gray-600 hover:border-gray-400 hover:scale-105'
                      }`}
                    >
                      <img
                        src={`/${concept.folder}/${image}`}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-contain bg-gray-800"
                      />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Image Counter */}
              {availableImages.length > 1 && (
                <div className="text-center">
                  <span className="text-gray-400 text-sm">
                    {currentImageIndex + 1} of {availableImages.length}
                  </span>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="space-y-6">
              {/* Audio Controls */}
              {content && !loading && !error && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 border border-gray-700 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-300 font-medium text-sm sm:text-base">
                      {speechSupported ? 'Listen to this concept' : 'Audio feedback (speech not supported)'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      onClick={handleTextToSpeech}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 rounded-lg transition-all duration-300 min-h-[44px] flex-1 sm:flex-initial ${
                        isPlaying
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      } hover:scale-105 shadow-lg touch-manipulation`}
                      title={isPlaying ? 'Stop' : 'Play'}
                    >
                      {isPlaying ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium whitespace-nowrap">
                        {isPlaying ? 'Playing...' : 'Play'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile-specific audio status */}
              {isPlaying && (
                <div className="sm:hidden bg-blue-900 bg-opacity-30 backdrop-blur-sm rounded-lg p-3 border border-blue-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-blue-300 text-sm">
                        {speechSupported ? 'Playing audio...' : 'Audio feedback active...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-400"></div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded-lg p-4">
                  <p className="text-red-400">Error loading concept details: {error}</p>
                </div>
              )}
              
              {!loading && !error && content && (
                <div className="prose prose-invert max-w-none">
                  {formatContent(content)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-98 z-[9999] flex items-center justify-center backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
          {/* Animated background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-50"></div>
          
          {/* Close Button */}
          <button
            onClick={closeFullscreen}
            className="absolute top-6 right-6 text-white hover:text-red-400 transition-all duration-300 p-3 rounded-full hover:bg-red-500 hover:bg-opacity-20 hover:scale-110 backdrop-blur-md bg-black bg-opacity-30 border border-gray-600 hover:border-red-400 z-[10000] group"
            title="Close"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Controls Bar */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 backdrop-blur-md rounded-2xl px-8 py-4 flex items-center space-x-6 z-[10000] border border-gray-600 shadow-2xl">
            {/* Zoom Out */}
            <button
              onClick={zoomOut}
              className="text-white hover:text-blue-400 transition-all duration-300 p-2 rounded-lg hover:bg-blue-500 hover:bg-opacity-20 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={zoom <= 0.5}
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 hover:scale-110 transition-transform duration-200" />
            </button>
            
            {/* Zoom Display */}
            <div className="flex items-center space-x-2">
              <div className="w-20 h-1 bg-gray-600 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 rounded-full"
                  style={{ width: `${((zoom - 0.5) / 2.5) * 100}%` }}
                ></div>
              </div>
              <span className="text-white text-sm min-w-[60px] text-center font-mono bg-gray-800 px-2 py-1 rounded">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            
            {/* Zoom In */}
            <button
              onClick={zoomIn}
              className="text-white hover:text-blue-400 transition-all duration-300 p-2 rounded-lg hover:bg-blue-500 hover:bg-opacity-20 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={zoom >= 3}
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5 hover:scale-110 transition-transform duration-200" />
            </button>
            
            {/* Divider */}
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-500 to-transparent"></div>
            
            {/* Rotate */}
            <button
              onClick={rotate}
              className="text-white hover:text-green-400 transition-all duration-300 p-2 rounded-lg hover:bg-green-500 hover:bg-opacity-20 hover:scale-110"
              title="Rotate"
            >
              <RotateCw className="w-5 h-5 hover:rotate-90 transition-transform duration-300" />
            </button>
            
            {/* Reset Button */}
            <button
              onClick={() => { setZoom(1); setRotation(0); }}
              className="text-white hover:text-yellow-400 transition-all duration-300 px-3 py-1 rounded-lg hover:bg-yellow-500 hover:bg-opacity-20 text-sm font-medium"
              title="Reset View"
            >
              Reset
            </button>
          </div>

          {/* Navigation Arrows */}
          {availableImages.length > 1 && (
            <>
              <button
                onClick={prevImageFullscreen}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 backdrop-blur-md hover:bg-opacity-80 text-white p-4 rounded-full transition-all duration-300 hover:scale-110 hover:-translate-x-1 z-[10000] border border-gray-600 hover:border-blue-400 shadow-2xl group"
                title="Previous Image"
              >
                <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={nextImageFullscreen}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 backdrop-blur-md hover:bg-opacity-80 text-white p-4 rounded-full transition-all duration-300 hover:scale-110 hover:translate-x-1 z-[10000] border border-gray-600 hover:border-blue-400 shadow-2xl group"
                title="Next Image"
              >
                <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {availableImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 backdrop-blur-md rounded-2xl px-6 py-3 z-[10000] border border-gray-600 shadow-2xl">
              <div className="flex items-center space-x-4">
                <div className="flex space-x-1">
                  {availableImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => { setCurrentImageIndex(index); setZoom(1); setRotation(0); }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        currentImageIndex === index 
                          ? 'bg-blue-400 scale-125' 
                          : 'bg-gray-500 hover:bg-gray-300 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white text-sm font-medium">
                  {currentImageIndex + 1} of {availableImages.length}
                </span>
              </div>
            </div>
          )}

          {/* Image Info Panel */}
          <div className="absolute bottom-6 right-6 bg-black bg-opacity-80 backdrop-blur-md rounded-2xl px-4 py-3 z-[10000] border border-gray-600 shadow-2xl">
            <div className="text-white text-sm space-y-1">
              <div className="font-medium">{concept.title}</div>
              <div className="text-gray-400 text-xs">
                {availableImages[currentImageIndex]?.replace('.png', '').replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          {/* Main Image */}
          <div className="w-full h-full flex items-center justify-center p-12 relative">
            {/* Loading indicator for image transitions */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse w-16 h-16 border-2 border-blue-400 border-t-transparent rounded-full animate-spin opacity-20"></div>
            </div>
            {/* Render animated or static image based on file extension */}
            {availableImages[currentImageIndex]?.match(/\.(avifs|webm|apng|gif)$/i) && !videoLoadError ? (
              <video
                src={`/${concept.folder}/${availableImages[currentImageIndex]}`}
                autoPlay
                loop
                muted
                playsInline
                className="max-w-full max-h-full object-contain transition-all duration-500 ease-out drop-shadow-2xl"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))',
                }}
                onLoad={() => {
                  // Video loaded successfully
                }}
                onError={(e) => {
                  setVideoLoadError(true);
                }}
              />
            ) : (
              <img
                src={`/${concept.folder}/${availableImages[currentImageIndex]}`}
                alt={`${concept.title} - Image ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain transition-all duration-500 ease-out drop-shadow-2xl"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))',
                }}
                onLoad={() => {
                  // Image loaded successfully
                }}
              />
            )}
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="absolute top-6 left-6 bg-black bg-opacity-80 backdrop-blur-md rounded-2xl px-4 py-2 z-[10000] border border-gray-600 shadow-2xl opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-xs space-y-1">
              <div><kbd className="bg-gray-700 px-1 rounded">ESC</kbd> Close</div>
              <div><kbd className="bg-gray-700 px-1 rounded">←→</kbd> Navigate</div>
              <div><kbd className="bg-gray-700 px-1 rounded">+−</kbd> Zoom</div>
              <div><kbd className="bg-gray-700 px-1 rounded">R</kbd> Rotate</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
