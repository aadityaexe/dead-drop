import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import CreateDrop from './components/CreateDrop'
import DropResult from './components/DropResult'
import ReadDrop from './components/ReadDrop'

function App() {
  return (
    <>
      <Navbar />

      <div className="page-content">
        <Routes>
          <Route path="/" element={<CreateDrop />} />
          <Route path="/drop/created" element={<DropResult />} />
          <Route path="/drop/:id" element={<ReadDrop />} />
        </Routes>
      </div>

      <div className="footer">
        <div>Zero knowledge. No accounts. No logs.</div>
      </div>
    </>
  )
}

export default App
