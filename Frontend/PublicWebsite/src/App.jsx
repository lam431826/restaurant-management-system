import { Routes, Route } from 'react-router-dom'
import Frontpage from './components/Frontpage'
import GuestOrderPage from './components/GuestOrderPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Frontpage />} />
      <Route path="/menu" element={<GuestOrderPage />} />
    </Routes>
  )
}
