import { useCallback } from 'react';

import { useAppContext } from '../contexts/AppContext';
import { Transaction } from '../types/card';

export const useTransactions = () => {
  const { transactions, dispatch } = useAppContext();

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    return newTransaction;
  }, [dispatch]);

  const getTransactionsByCard = useCallback((cardId: string) => {
    return transactions.filter(transaction => transaction.cardId === cardId);
  }, [transactions]);

  const getRecentTransactions = useCallback((limit = 10) => {
    return transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }, [transactions]);

  const getTotalPoints = useCallback((cardId?: string) => {
    const relevantTransactions = cardId 
      ? getTransactionsByCard(cardId)
      : transactions;
    
    return relevantTransactions.reduce((total, transaction) => {
      return transaction.type === 'earn' 
        ? total + transaction.points 
        : total - transaction.points;
    }, 0);
  }, [transactions, getTransactionsByCard]);

  const getTotalSpent = useCallback((cardId?: string) => {
    const relevantTransactions = cardId 
      ? getTransactionsByCard(cardId)
      : transactions;
    
    return relevantTransactions.reduce((total, transaction) => {
      return total + transaction.amount;
    }, 0);
  }, [transactions, getTransactionsByCard]);

  return {
    transactions,
    addTransaction,
    getTransactionsByCard,
    recentTransactions: getRecentTransactions(),
    getTotalPoints,
    getTotalSpent,
  };
};