'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/landingpage/Header';
import { cookies } from 'next/headers';

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  groupId?: string;
  receiverId?: string;
  content: string;
  timestamp: string;
}

interface Group {
  _id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function NetworkingPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatType, setChatType] = useState<'group' | 'individual'>('group');
  const [userRole, setUserRole] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch groups and users when component mounts
  useEffect(() => {
    fetchGroups();
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    const userId = sessionStorage.getItem('user_id');
    
    if (userId) {
      // No need to pass token in URL as it will be sent in cookies automatically
      const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setSocket(ws);
      };
      
      ws.onmessage = (event) => {
        const receivedData = JSON.parse(event.data);
        console.log('WebSocket message received:', receivedData);
        
        if (receivedData.type === 'group_message' && chatType === 'group') {
          const messageData = receivedData.data;
          if (messageData.groupId === selectedGroup?._id) {
            setMessages(prev => [...prev, messageData]);
          }
        } else if (receivedData.type === 'message' && chatType === 'individual') {
          // For individual chat, check if the message is from or to the selected user
          const messageData = receivedData.data;
          const currentUserId = sessionStorage.getItem('user_id');
          if ((messageData.senderId === selectedUser?._id && messageData.receiverId === currentUserId) || 
              (messageData.senderId === currentUserId && messageData.receiverId === selectedUser?._id)) {
            setMessages(prev => [...prev, messageData]);
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect to chat server');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };
      
      return () => {
        ws.close();
      };
    }
  }, [selectedGroup, selectedUser, chatType]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/groups/', {
        credentials: 'include',
        headers: {
          'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups');
      }

      const data = await response.json();
      setGroups(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/users/', {
        credentials: 'include',
        headers: {
          'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      setLoading(false);
    }
  };

  const fetchCurrentUserRole = async () => {
    try {
      const response = await fetch('http://localhost:8000/users/me', {
        credentials: 'include',
        headers: {
          'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }

      const data = await response.json();
      setUserRole(data.role);
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchMessages = async (groupId?: string, userId?: string) => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/messages/?';
      
      if (chatType === 'group' && groupId) {
        url += `group_id=${groupId}`;
      } else if (chatType === 'individual' && userId) {
        url += `receiver_id=${userId}`;
      } else {
        setMessages([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
      setLoading(false);
    }
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setChatType('group');
    fetchMessages(group._id);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setChatType('individual');
    fetchMessages(undefined, user._id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    let message;
    
    if (chatType === 'group' && selectedGroup) {
      message = {
        type: 'group_message',
        groupId: selectedGroup._id,
        content: newMessage
      };
    } else if (chatType === 'individual' && selectedUser) {
      message = {
        type: 'message',
        receiverId: selectedUser._id,
        content: newMessage
      };
    } else {
      return;
    }

    socket.send(JSON.stringify(message));
    setNewMessage('');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch('http://localhost:8000/groups/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const newGroup = await response.json();
      setGroups(prev => [...prev, newGroup]);
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateGroup(false);
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Navigation items for sidebar
 

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white">
      <Header />
      <div className="h-16"></div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-6 relative">
          {/* Main Content */}
          <div className={`${isSidebarCollapsed ? 'col-span-11' : 'col-span-9'} transition-all duration-300 ease-in-out`}>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Networking</h2>
                {userRole === 'Admin' && (
                  <button 
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Create New Group
                  </button>
                )}
              </div>
              
              <div className="flex space-x-4 mb-8">
                <button
                  onClick={() => setChatType('group')}
                  className={`px-6 py-3 rounded-xl transition-all duration-300 ${chatType === 'group' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Group Chat
                </button>
                <button
                  onClick={() => setChatType('individual')}
                  className={`px-6 py-3 rounded-xl transition-all duration-300 ${chatType === 'individual' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Individual Chat
                </button>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-300px)]">
                {/* Groups/Users List */}
                <div className="w-full md:w-1/3 bg-gray-50 rounded-lg shadow-sm overflow-y-auto">
                  <div className="p-4 border-b border-gray-100 bg-white">
                    <h3 className="font-medium text-gray-800">{chatType === 'group' ? 'Groups' : 'Users'}</h3>
                  </div>
                  
                  {loading && ((chatType === 'group' && groups.length === 0) || (chatType === 'individual' && users.length === 0)) ? (
                    <div className="p-4 text-center text-gray-500">Loading {chatType === 'group' ? 'groups' : 'users'}...</div>
                  ) : chatType === 'group' ? (
                    groups.length > 0 ? (
                      <ul>
                        {groups.map(group => (
                          <li 
                            key={group._id} 
                            onClick={() => handleGroupSelect(group)}
                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${selectedGroup?._id === group._id ? 'bg-gradient-to-r from-blue-100 to-indigo-100' : ''}`}
                          >
                            <h4 className="font-medium text-gray-800">{group.name}</h4>
                            <p className="text-sm text-gray-500 truncate">{group.description}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 text-center text-gray-500">No groups found</div>
                    )
                  ) : users.length > 0 ? (
                    <ul>
                      {users.map(user => (
                        <li 
                          key={user._id} 
                          onClick={() => handleUserSelect(user)}
                          className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${selectedUser?._id === user._id ? 'bg-gradient-to-r from-blue-100 to-indigo-100' : ''}`}
                        >
                          <h4 className="font-medium text-gray-800">{user.name}</h4>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                          <span className={`inline-block w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-gray-500">No users found</div>
                  )}
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
                  {(chatType === 'group' && selectedGroup) || (chatType === 'individual' && selectedUser) ? (
                    <>
                      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        {chatType === 'group' && selectedGroup ? (
                          <>
                            <h3 className="font-semibold text-gray-800 text-lg">{selectedGroup.name}</h3>
                            <p className="text-sm text-gray-600">{selectedGroup.description}</p>
                          </>
                        ) : chatType === 'individual' && selectedUser ? (
                          <>
                            <h3 className="font-semibold text-gray-800 text-lg">{selectedUser.name}</h3>
                            <p className="text-sm text-gray-600">{selectedUser.email}</p>
                            <span className={`inline-block w-2 h-2 rounded-full ml-2 ${selectedUser.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          </>
                        ) : null}
                      </div>
                      
                      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        {loading ? (
                          <div className="text-center text-gray-500">Loading messages...</div>
                        ) : messages.length > 0 ? (
                          <div className="space-y-4">
                            {messages.map(message => (
                              <div key={message._id} className="flex flex-col">
                                <div className="flex items-end">
                                  <div className="bg-white rounded-lg shadow-sm p-3 max-w-xs md:max-w-md">
                                    <div className="font-medium text-blue-600">{message.senderName}</div>
                                    <p className="text-gray-800">{message.content}</p>
                                  </div>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatDate(message.timestamp)}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div ref={messagesEndRef} />
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">No messages yet</div>
                        )}
                      </div>
                      
                      <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 p-3 border border-gray-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={handleSendMessage}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-r-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      {chatType === 'group' ? 'Select a group to start chatting' : 'Select a user to start chatting'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 hover:scale-[1.02]">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">Create New Group</h3>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="groupName">
                Group Name
              </label>
              <input
                id="groupName"
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter group name"
              />
            </div>
            
            <div className="mb-8">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="groupDescription">
                Description
              </label>
              <textarea
                id="groupDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter group description"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}