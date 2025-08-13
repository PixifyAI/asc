import React, { useState } from 'react';
import { Gallery } from './components/Gallery';
import { ConceptDetail } from './components/ConceptDetail';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { useConcepts } from './hooks/useConcepts';
import { Concept } from './types/concept';

function App() {
  const { concepts, loading, error } = useConcepts();
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  const handleSelectConcept = (concept: Concept) => {
    setSelectedConcept(concept);
  };

  const handleBack = () => {
    setSelectedConcept(null);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="min-h-screen bg-black">
      {selectedConcept ? (
        <ConceptDetail concept={selectedConcept} onBack={handleBack} />
      ) : (
        <Gallery concepts={concepts} onSelectConcept={handleSelectConcept} />
      )}
    </div>
  );
}

export default App;