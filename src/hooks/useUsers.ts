import { useState, useEffect } from 'react';
import { database, User as DatabaseUser } from '../lib/database';
import { User } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = database.getUsers();

      const mappedUsers: User[] = data.map((user: DatabaseUser) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        lastActive: user.last_active
      }));

      setUsers(mappedUsers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: {
    username: string;
    email: string;
    role?: 'admin' | 'user' | 'viewer';
    status?: 'active' | 'inactive' | 'suspended';
  }) => {
    try {
      // For demo purposes, use dummy password hash
      const passwordHash = '$2a$10$dummy.hash.for.demo';
      
      const newUser = database.createUser({
        username: userData.username,
        email: userData.email,
        password_hash: passwordHash,
        role: userData.role || 'user',
        status: userData.status || 'active',
        last_active: new Date().toISOString()
      });

      await fetchUsers(); // Refresh list
      return newUser;
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  };

  const updateUser = async (userId: string, updates: Partial<DatabaseUser>) => {
    try {
      database.updateUser(userId, updates);
      await fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      database.deleteUser(userId);
      await fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
}