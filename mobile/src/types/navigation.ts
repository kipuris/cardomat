import { LoyaltyCard } from './card';

export type RootTabParamList = {
  Dashboard: undefined;
  Cards: undefined;
  Scan: undefined;
  Transactions: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  CardDetail: { card: LoyaltyCard };
  AddCard: undefined;
  ManualEntry: undefined;
};