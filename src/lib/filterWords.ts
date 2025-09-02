import dbConnect from '@/lib/mongodb';
import FilteredWord from '@/models/FilteredWord';

interface FilterResult {
  isFlagged: boolean;
  flaggedWords: string[];
}

export async function checkFilteredWords(text: string): Promise<FilterResult> {
  try {
    await dbConnect();
    
    // Get all active filtered words
    const filteredWords = await FilteredWord.find({ isActive: true }).lean();
    
    if (!filteredWords.length) {
      return { isFlagged: false, flaggedWords: [] };
    }
    
    // Convert text to lowercase for comparison
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    const flaggedWords: string[] = [];
    
    // Check each filtered word
    for (const filteredWord of filteredWords) {
      const word = filteredWord.word.toLowerCase();
      
      // Check for exact word match or if the filtered word is contained in the text
      if (words.includes(word) || lowerText.includes(word)) {
        flaggedWords.push(filteredWord.word);
      }
    }
    
    return {
      isFlagged: flaggedWords.length > 0,
      flaggedWords: [...new Set(flaggedWords)] // Remove duplicates
    };
  } catch (error) {
    console.error('Error checking filtered words:', error);
    // In case of error, don't block the review but log the issue
    return { isFlagged: false, flaggedWords: [] };
  }
}