function formatOption(value) {
  const characters = Array.from(value.toLowerCase());
  if (characters.length > 0) characters[0] = characters[0].toUpperCase();
  return characters.join('');
}

module.exports = { formatOption };