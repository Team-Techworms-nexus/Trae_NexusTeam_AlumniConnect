'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SuperAdminCredentials {
  name: string;
  password: string;
}

interface College {
  _id: string;
  collegeId: string;
  collegeName: string;
  email: string;
  location?: string;
  established?: number;
  website?: string;
  phone?: string;
  description?: string;
  logo_url?: string;
  departments?: string[];
  accreditation?: string;
  status: 'pending' | 'approved' | 'rejected';
  databaseName: string;
}

interface CollegeMeta {
  total_students: number;
  total_alumni: number;
  total_achievements: number;
  total_donations: number;
  donations_growth_percent: number;
  achievements_growth_percent: number;
  active_groups: number;
  upcoming_events: number;
  recent_achievements: number;
  recent_donations: number;
  last_updated: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<SuperAdminCredentials>({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [collegeMeta, setCollegeMeta] = useState<CollegeMeta | null>(null);

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://trae-nexusteam-alumniconnect.onrender.com/colleges/', {
        credentials: 'include',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch colleges');
      }

      const data = await response.json();
      setColleges(data.colleges);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCollege = async (collegeId: string) => {
    try {
      const response = await fetch(`https://trae-nexusteam-alumniconnect.onrender.com/colleges/${collegeId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to approve college');
      }

      // Refresh colleges list
      fetchColleges();
    } catch (error) {
      console.error('Error approving college:', error);
    }
  };

  const handleRejectCollege = async (collegeId: string) => {
    try {
      const response = await fetch(`https://trae-nexusteam-alumniconnect.onrender.com/colleges/${collegeId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reject college');
      }

      // Refresh colleges list
      fetchColleges();
    } catch (error) {
      console.error('Error rejecting college:', error);
    }
  };

  const getCsrfToken = () => {
    return sessionStorage.getItem('csrf_token') || '';
  };
  

  useEffect(() => {
    // Check if user is already authenticated
    const token = sessionStorage.getItem('superadmin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchColleges();
    }
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    
    try {
      const response = await fetch('https://trae-nexusteam-alumniconnect.onrender.com/superadmin/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store token and mark as authenticated
      sessionStorage.setItem('superadmin_token', data.csrf_token);
      setIsAuthenticated(true);
      fetchColleges();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('superadmin_token');
    setIsAuthenticated(false);
    setCredentials({ name: '', password: '' });
  };

  const filteredColleges = colleges.filter(college => {
    const matchesSearch = college.collegeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         college.collegeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || college.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Super Admin Login</h1>
          
          {loginError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                name
              </label>
              <input
                id="name"
                type="text"
                required
                value={credentials.name}
                onChange={(e) => setCredentials({...credentials, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter name"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Search colleges..."
            className="px-4 py-2 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="px-4 py-2 border rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">Loading colleges...</p>
        </div>
      ) : filteredColleges.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">College ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredColleges.map((college) => (
                <tr key={college._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{college.collegeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{college.collegeId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{college.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${college.status === 'approved' ? 'bg-green-100 text-green-800' :
                        college.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'}`}
                    >
                      {college.status.charAt(0).toUpperCase() + college.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedCollege(college);
                        setShowDetailsModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </button>
                    {college.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveCollege(college.collegeId)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectCollege(college.collegeId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-600">No colleges found.</p>
        </div>
      )}

      {/* College Details Modal */}
      {showDetailsModal && selectedCollege && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">College Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">College Name:</span> {selectedCollege.collegeName}</p>
                  <p><span className="font-medium">College ID:</span> {selectedCollege.collegeId}</p>
                  <p><span className="font-medium">Email:</span> {selectedCollege.email}</p>
                  <p><span className="font-medium">Phone:</span> {selectedCollege.phone || 'N/A'}</p>
                  <p><span className="font-medium">Location:</span> {selectedCollege.location || 'N/A'}</p>
                  <p><span className="font-medium">Established:</span> {selectedCollege.established || 'N/A'}</p>
                  <p><span className="font-medium">Website:</span> {selectedCollege.website || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Additional Information</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">Departments:</span> {selectedCollege.departments?.join(', ') || 'N/A'}</p>
                  <p><span className="font-medium">Accreditation:</span> {selectedCollege.accreditation || 'N/A'}</p>
                  <p><span className="font-medium">Status:</span> {selectedCollege.status}</p>
                </div>

                {collegeMeta && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Statistics</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Total Students:</span> {collegeMeta.total_students}</p>
                      <p><span className="font-medium">Total Alumni:</span> {collegeMeta.total_alumni}</p>
                      <p><span className="font-medium">Total Achievements:</span> {collegeMeta.total_achievements}</p>
                      <p><span className="font-medium">Active Groups:</span> {collegeMeta.active_groups}</p>
                      <p><span className="font-medium">Upcoming Events:</span> {collegeMeta.upcoming_events}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}