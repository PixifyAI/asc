import { useState, useEffect } from 'react';
import { Concept, ConceptsData } from '../types/concept';

export const useConcepts = () => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConcepts = async () => {
      try {
        const response = await fetch('/concepts.json');
        if (!response.ok) {
          throw new Error('Failed to fetch concepts');
        }
        const data: ConceptsData = await response.json();
        
        setConcepts(data.concepts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchConcepts();
  }, []);

  return { concepts, loading, error };
};