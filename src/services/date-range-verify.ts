export const dateRangeCompute = (
  startDate: Date,
  endDate: Date,
  months: string,
) => {
  // const startDate = new Date(date1);
  // const endDate = new Date(date2);

  // Calculate the difference in months
  const duartionInMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  // const result = duartionInMonths === +months;
  return duartionInMonths;
};
