export function formatData(rawData) {
  return rawData.map(item => ({
    id: item.id,
    title: item.title || item.name,
    // ...transform data
  }));
}

export function validateInput(input) {
  // Validation logic
  return input.trim().length > 0;
}
