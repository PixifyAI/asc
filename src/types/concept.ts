export interface Concept {
  id: string;
  title: string;
  folder: string;
  mainImage: string;
  images: string[];
  textFile: string;
}

export interface ConceptsData {
  concepts: Concept[];
}