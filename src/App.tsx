import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">Lisa</h1>
      </header>
      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<div>Home placeholder</div>} />
          <Route path="/list/:id" element={<div>ListView placeholder</div>} />
          <Route path="/join/:listId/:token" element={<div>JoinList placeholder</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
