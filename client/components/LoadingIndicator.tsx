/**
 * @file This file contains the LoadingIndicator component.
 * It provides a consistent loading spinner and message to be used across the application
 * while data is being fetched or processed.
 */

import React from 'react';
import { Spinner } from './UIElements';

interface LoadingIndicatorProps {
  /** The message to display below the spinner. */
  message?: string;
  /** The size of the spinner. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A reusable component to indicate a loading state to the user.
 */
const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Loading, please wait...", size = 'md' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 my-6">
      <Spinner size={size} />
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 font-medium">{message}</p>
    </div>
  );
};

export default LoadingIndicator;