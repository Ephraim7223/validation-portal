export const camelToHuman = (text: string[]) => {
  return text[0].replace(/([a-z])([A-Z])/g, '$1 $2');
};
