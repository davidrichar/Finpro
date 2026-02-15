
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // Handle Brazilian format: 1.000,00 -> 1000.00
    // 1. Remove dots (thousand separators)
    // 2. Replace comma with dot (decimal separator)
    // 3. Remove non-numeric chars (except dot and minus)
    const cleanedValue = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanedValue);
    return isNaN(parsed) ? 0 : parsed;
};
