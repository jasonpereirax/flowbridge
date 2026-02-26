import { CanvasWorkspace } from '@/components/canvas/CanvasWorkspace'

interface Props {
  params: Promise<{ id: string }>
}

// The canvas is entirely client-side — this page just passes the project ID down
export default async function CanvasPage({ params }: Props) {
  const { id } = await params
  return <CanvasWorkspace projectId={id} />
}
