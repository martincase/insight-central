
export const blurAccountName = (name: string, isBlurred: boolean): string => {
  if (!isBlurred) return name;
  
  // Replace all characters except spaces with blur characters
  return name.replace(/[^\s]/g, '●');
};

export const getBlurredDisplayName = (name: string, isBlurred: boolean): string => {
  if (!isBlurred) return name;
  
  // Create a pattern like "Client ●●●" to maintain some structure
  const words = name.split(' ');
  return words.map((word, index) => {
    if (index === 0 && word.toLowerCase() === 'client') {
      return 'Client';
    }
    return '●'.repeat(Math.max(3, word.length));
  }).join(' ');
};
