export const mockTask = {
  id: 'TASK-1247',
  title: 'Implement user authentication system',
  description: 'Build a secure authentication system with JWT tokens, refresh token rotation, and proper error handling. Should include password reset functionality and two-factor authentication support.',
  assignees: [
    { id: '1', name: 'Sarah Chen', avatar: 'SC', color: 'bg-blue-500' },
    { id: '2', name: 'Marcus Johnson', avatar: 'MJ', color: 'bg-purple-500' },
    { id: '3', name: 'Elena Rodriguez', avatar: 'ER', color: 'bg-pink-500' },
  ],
  phase: 'Backend Development',
  type: 'Feature',
  status: 'In Progress',
  startDate: '2025-03-01',
  dueDate: '2025-03-28',
  estimatedTime: 480,
  loggedTime: 320,
  timeLogs: [
    {
      id: '1',
      avatar: 'SC',
      user: 'Sarah Chen',
      date: 'Mar 20',
      duration: '2h 00m',
      description: 'Set up authentication endpoints and middleware'
    },
    {
      id: '2',
      avatar: 'MJ',
      user: 'Marcus Johnson',
      date: 'Mar 19',
      duration: '1h 40m',
      description: 'Implemented JWT token generation and validation'
    },
    {
      id: '3',
      avatar: 'ER',
      user: 'Elena Rodriguez',
      date: 'Mar 18',
      duration: '1h 40m',
      description: 'Database schema design and user model creation'
    },
  ],
  comments: [
    {
      id: '1',
      author: 'Sarah Chen',
      avatar: 'SC',
      timestamp: 'Mar 20, 14:30',
      text: 'Great progress on the authentication endpoints. The error handling looks solid.',
    },
    {
      id: '2',
      author: 'Marcus Johnson',
      avatar: 'MJ',
      timestamp: 'Mar 20, 10:15',
      text: 'Added refresh token rotation logic. Ready for review.',
    },
    {
      id: '3',
      author: 'Elena Rodriguez',
      avatar: 'ER',
      timestamp: 'Mar 19, 16:45',
      text: 'Password reset endpoint is working. Testing with different email providers.',
    },
  ],
  resources: [
    { id: '1', name: 'PostgreSQL Database', type: 'DB' },
    { id: '2', name: 'Redis Cache', type: 'Cache' },
    { id: '3', name: 'JWT Library', type: 'Lib' },
    { id: '4', name: 'Bcrypt', type: 'Lib' },
  ],
}
