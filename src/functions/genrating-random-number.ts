export function generateRandomNumber(digits: number): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}

export function generateUserID(role: string): string {
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const randomNumber = generateRandomNumber(2);
  const firstLetter = role.charAt(0).toUpperCase();
  return `${currentYear}/${randomNumber}/${firstLetter}`;
}

export function generateHubID(hubName: string): string {
  const firstLetter = hubName.charAt(0).toUpperCase();
  // const lastLetter = hubName.charAt(hubName.length - 1).toUpperCase();
  const secondLetter = hubName.charAt(1).toUpperCase();
  const thirdLetter = hubName.charAt(1).toUpperCase();
  const randomNumber = generateRandomNumber(4);
  return `${firstLetter}${secondLetter}${thirdLetter}/${randomNumber}`;
}
