import React from 'react';
import { Poll } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './UIElements';

interface PollComponentProps {
  messageId: string;
  poll: Poll;
  onVote: (messageId: string, optionIndex: number) => void;
}

const PollComponent: React.FC<PollComponentProps> = ({ messageId, poll, onVote }) => {
  const { user } = useAuth();
  
  const totalVotes = poll.options.reduce((sum, option) => sum + option.voters.length, 0);
  const userVoteIndex = poll.options.findIndex(option => user && option.voters.includes(user.id));

  return (
    <div className="w-full">
      <h4 className="font-bold text-slate-900 dark:text-white mb-3">{poll.question}</h4>
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const voteCount = option.voters.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const userVotedForThis = userVoteIndex === index;

          return (
            <div key={index}>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span className={`font-medium ${userVotedForThis ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>{option.text}</span>
                <span className="text-slate-500 dark:text-slate-400">{voteCount} votes</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-2.5 relative">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full" 
                  style={{ width: `${percentage}%` }}
                ></div>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white mix-blend-difference">{percentage}%</span>
              </div>
              {user && (
                <div className="text-right mt-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`!text-xs ${userVotedForThis ? '!bg-indigo-100 dark:!bg-indigo-900/50 !text-indigo-700 dark:!text-indigo-200' : ''}`}
                        onClick={() => onVote(messageId, index)}
                    >
                        {userVotedForThis ? 'Voted' : 'Vote'}
                    </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
       <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-right">Total Votes: {totalVotes}</p>
    </div>
  );
};

export default PollComponent;