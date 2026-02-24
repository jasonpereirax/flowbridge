import express from 'express'
import cors from 'cors'
import { generateRoute } from './routes/generate.js'
import { figmaRoute } from './routes/figma.js'

const app  = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.VITE_APP_URL ?? 'http://localhost:3000' }))
app.use(express.json())

app.use('/api/generate', generateRoute)
app.use('/api/figma',    figmaRoute)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`🚀  API server running on http://localhost:${PORT}`)
})
