import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

export const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'farmer' as 'farmer' | 'vet' | 'agrologist'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { name, email, phone, password, confirmPassword, role } = formData;

    if (!name || !email || !phone || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await signup({ name, email, phone, password, role });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Join KisanSeva</h2>
          <p className="text-gray-500">Create an account to start your journey</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 border border-red-100"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-6 border border-green-200"
          >
            Account created successfully! Redirecting to login...
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            <motion.div variants={itemVariants}>
              <Input
                label="Full Name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                icon={User}
                disabled={isLoading || success}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                icon={Mail}
                disabled={isLoading || success}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                label="Phone Number"
                name="phone"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={handleChange}
                icon={Phone}
                disabled={isLoading || success}
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <div className="w-full flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700">I am a</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading || success}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="farmer">Farmer</option>
                  <option value="vet">Veterinary Expert</option>
                  <option value="agrologist">Agrologist</option>
                </select>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="••••••"
                value={formData.password}
                onChange={handleChange}
                icon={Lock}
                disabled={isLoading || success}
              />
              <Input
                label="Confirm"
                type="password"
                name="confirmPassword"
                placeholder="••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                icon={Lock}
                disabled={isLoading || success}
              />
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={success}
                icon={<UserPlus size={18} />}
              >
                Create Account
              </Button>
            </motion.div>
          </motion.div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors">
            Log in
          </Link>
        </div>
      </Card>
    </motion.div>
  );
};
