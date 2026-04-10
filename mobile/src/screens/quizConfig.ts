export type QuizImageOption = {
  value: string;
  imageUrl: string;
};

export type BudgetOption = {
  title: string;
  budgetValue: number;
  dbValue: 'Budget' | 'Standard' | 'Premium' | 'Luxury';
};

export const styleOptions: QuizImageOption[] = [
  { value: 'Minimalistic', imageUrl: 'https://wohnenimkleinformat.de/wp-content/uploads/kueche-mit-kochinsel-boho.png' },
  { value: 'Modern', imageUrl: 'https://i.pinimg.com/1200x/b0/0d/8b/b00d8bef45550c2ac16a11ca7915da92.jpg' },
  { value: 'Industrial', imageUrl: 'https://hauszi.de/wp-content/uploads/2025/05/1__Insel-Liebe__Dein_Industrial-Hub_f_r_Genuss___Gespr_ch-1.png' },
  { value: 'Maximalistic', imageUrl: 'https://i.pinimg.com/736x/2b/41/5d/2b415d0e89cb0d75039d5af3ea34650f.jpg' },
  { value: 'Traditional', imageUrl: 'https://i.pinimg.com/736x/47/e0/93/47e093a147bd6c6c34813c934d2512d5.jpg' },
  { value: 'Vintage / Art Deco', imageUrl: 'https://i.pinimg.com/736x/d8/fd/e7/d8fde767bc0870d3da26cf00a74a1edb.jpg' },
  { value: 'Cottagecore', imageUrl: 'https://i.pinimg.com/736x/6f/a0/5f/6fa05f94fc64226ea2d6b79ce1dfda56.jpg' },
];

export const moodOptions: QuizImageOption[] = [
  { value: 'Cosy & Inviting', imageUrl: 'https://i.pinimg.com/736x/1a/1e/5a/1a1e5a8116f7a16acaa2874c11bf0b03.jpg' },
  { value: 'Sleek & Modern', imageUrl: 'https://fancyhouse-design.com/wp-content/uploads/2023/11/A-contemporary-bedroom-design-pairs-a-minimalist-aesthetic-with-luxurious-textures..jpg' },
  { value: 'Serene & Calm', imageUrl: 'https://i.pinimg.com/1200x/4e/34/33/4e34332a13d46736f0e37721d72ef43a.jpg' },
  { value: 'Rustic & Warm', imageUrl: 'https://i.pinimg.com/1200x/fd/98/c2/fd98c23edcb3d1625f434a30ee5c2780.jpg' },
  { value: 'Luxurious & Opulent', imageUrl: 'https://i.pinimg.com/1200x/35/1c/2d/351c2d8c81f5ecfc1719c33ec26a3e01.jpg' },
  { value: 'Natural & Organic', imageUrl: 'https://i.pinimg.com/1200x/32/89/95/328995c858d9bd65eb88f388d052b54c.jpg' },
];

export const budgetOptions: BudgetOption[] = [
  { title: 'Less than 200 rs', dbValue: 'Budget', budgetValue: 200 },
  { title: '200-500 rs', dbValue: 'Standard', budgetValue: 500 },
  { title: '500-5000 rs', dbValue: 'Premium', budgetValue: 5000 },
  { title: '5000+ rs', dbValue: 'Luxury', budgetValue: 7000 },
];
