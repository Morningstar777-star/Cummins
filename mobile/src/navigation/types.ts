export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  Admin: undefined;
  AdminProducts: undefined;
  QuizAesthetic: undefined;
  QuizMood: { aesthetic_style: string };
  QuizBudget: { aesthetic_style: string; mood_feel: string };
  Home: undefined;
  ArModels: undefined;
  Profile: undefined;
  AllProducts: undefined;
  Catalog: { categoryId: string; title: string };
  ProductDetail: { sku: string };
  Cart: undefined;
  PaymentSuccess: { order: any };
  Orders: undefined;
};
