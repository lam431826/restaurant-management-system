import { Navigate } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
  redirectTo?: string
}

const ProtectedRoute = ({ children, roles, redirectTo = '/login' }: Props) => {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to={redirectTo} replace />

  return <>{children}</>
}

export default ProtectedRoute
