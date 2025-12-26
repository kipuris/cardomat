import { LoyaltyCard } from "./card";

export type RootTabParamList = {
  Dashboard: undefined;
  Cards: undefined;
  Scan: undefined;
  Transactions: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CardDetail: { card: LoyaltyCard };
  AddCard: undefined;
  ManualEntry: undefined;
};
