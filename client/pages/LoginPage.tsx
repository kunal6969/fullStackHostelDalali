/**
 * @file This file contains the LoginPage component, which handles both user login and multi-step user signup.
 * It manages form state, validation, and interaction with the authentication context.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Alert, Select, AtSymbolIcon, LockClosedIcon, UserCircleIcon } from '../components/UIElements';
import { KeyIcon, RocketIcon, SparkleIcon, CheckmarkIcon, PencilIcon } from '../components/VibrantIcons';
import { MNIT_EMAIL_DOMAIN } from '../constants';
import { User } from '../types';
import { fetchApi } from '../services/api';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'initial' | 'login' | 'signup'>('initial');
  const [signupStep, setSignupStep] = useState<'details' | 'credentials'>('details');
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [gender, setGender] = useState<User['gender']>('Male');
  const [error, setError] = useState<string>('');
  
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const resetFormState = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setGender('Male');
    setError('');
    setSignupStep('details');
  };

  const handleBackToInitial = () => {
    resetFormState();
    setMode('initial');
  };
  
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.endsWith(`@${MNIT_EMAIL_DOMAIN}`)) {
      setError(`Please use your @${MNIT_EMAIL_DOMAIN} email address.`);
      return;
    }
    if (!password) {
        setError('Please enter your password.');
        return;
    }

    try {
      await login(email, password, { isSignup: false });
      navigate('/dashboard');
    } catch (err) {
        setError((err as Error).message || 'An unknown login error occurred.');
    }
  };

  const handleSignupDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.endsWith(`@${MNIT_EMAIL_DOMAIN}`)) {
      setError(`Please use your @${MNIT_EMAIL_DOMAIN} email address.`);
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setSignupStep('credentials');
  };
  
  const handleSignupCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
    }

    try {
      // The `login` function in context handles the signup logic
      await login(email, password, { fullName, gender, isSignup: true });
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred during signup.');
    }
  };

  const genderOptions: Array<{ value: User['gender']; label: string }> = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ];

  if (authLoading && !user) { 
    return <div className="flex justify-center items-center min-h-screen"><Button isLoading={true} variant="primary" size="lg">Loading...</Button></div>;
  }
  if (user) return null; 

  const renderContent = () => {
    switch(mode) {
      case 'login':
        return (
          <>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2"> 
              <KeyIcon className="w-8 h-8"/> Login to your Account
            </h2>
            <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
              {error && <Alert type="error" message={error} onClose={() => setError('')} />}
              <Input
                id="email-address-login" 
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="yourname@mnit.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="MNIT Email address"
                icon={<AtSymbolIcon />}
              />
              <Input
                id="password-login" 
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                label="Password"
                icon={<LockClosedIcon />}
              />
              <div>
                <Button type="submit" className="w-full" isLoading={authLoading} variant="primary" size="lg" leftIcon={<RocketIcon />}>
                  Login
                </Button>
              </div>
              <div className="text-center">
                <Button variant="ghost" type="button" onClick={handleBackToInitial} className="text-sm !text-slate-500 hover:!text-slate-900 dark:!text-slate-400 dark:hover:!text-slate-100">
                    &larr; Back
                </Button>
              </div>
            </form>
          </>
        );
      
      case 'signup':
        if (signupStep === 'details') {
          return (
            <>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2"> 
                <RocketIcon className="w-8 h-8"/> Sign Up - Step 1 of 2
              </h2>
              <form className="mt-8 space-y-6" onSubmit={handleSignupDetailsSubmit}>
                {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                 <Input
                  id="email-address-signup" 
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="yourname@mnit.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="MNIT Email address"
                  icon={<AtSymbolIcon />}
                />
                 <Input
                    id="fullName" name="fullName" type="text" autoComplete="name" required
                    placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    label="Full Name" icon={<UserCircleIcon />}
                />
                <Select
                    id="gender" name="gender" required value={gender}
                    onChange={(e) => setGender(e.target.value as User['gender'])}
                    options={genderOptions} label="Gender"
                />
                <div>
                  <Button type="submit" className="w-full" variant="primary" size="lg">
                    Continue ➡️
                  </Button>
                </div>
                <div className="text-center">
                    <Button variant="ghost" type="button" onClick={handleBackToInitial} className="text-sm !text-slate-500 hover:!text-slate-900 dark:!text-slate-400 dark:hover:!text-slate-100">
                        &larr; Back
                    </Button>
                </div>
              </form>
            </>
          );
        }
        if (signupStep === 'credentials') {
          return (
             <>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2"> 
                    <SparkleIcon className="w-8 h-8"/> Sign Up - Step 2 of 2
                </h2>
                <p className="mt-2 text-center text-sm text-slate-700 dark:text-slate-300">
                  Create a secure password to protect your account.
                </p>
                <form className="mt-8 space-y-6" onSubmit={handleSignupCredentialsSubmit}>
                    {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                    <Input
                        id="password-signup"
                        name="password"
                        type="password"
                        required
                        placeholder="Choose a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        label="Password"
                        icon={<LockClosedIcon />}
                    />
                    <div>
                        <Button type="submit" className="w-full" isLoading={authLoading} variant="primary" size="lg" leftIcon={<CheckmarkIcon />}>
                            Create Account
                        </Button>
                    </div>
                     <div className="text-center">
                        <Button variant="ghost" type="button" onClick={() => {setError(''); setSignupStep('details');}} className="text-sm !text-slate-500 hover:!text-slate-900 dark:!text-slate-400 dark:hover:!text-slate-100">
                            &larr; Back to details
                        </Button>
                    </div>
                </form>
            </>
          );
        }
        return null;

      case 'initial':
      default:
        return (
          <>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white"> 
              Welcome to 
             Hostel Dalali 
            </h2>
            <p className="mt-2 text-center text-sm text-slate-700 dark:text-slate-300">
              Your one-stop platform for hostel room exchange and community connection at MNIT.
            </p>
            <div className="mt-12 space-y-4">
                <Button 
                    onClick={() => { resetFormState(); setMode('login'); }}  
                    className="w-full"
                    variant="primary" 
                    size="lg"
                    leftIcon={<KeyIcon />}
                >
                    Login
                </Button>
                <Button 
                    onClick={() => { resetFormState(); setMode('signup'); }} 
                    className="w-full"
                    variant="secondary" 
                    size="lg"
                    leftIcon={<PencilIcon />}
                >
                    Sign Up
                </Button>
            </div>
          </>
        );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white/80 dark:bg-black/40 backdrop-blur-md p-10 rounded-xl shadow-2xl border border-white/20 dark:border-white/10 animate-pop-in">
        {renderContent()}
      </div>
    </div>
  );
};

export default LoginPage;