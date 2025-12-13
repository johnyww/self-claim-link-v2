import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// A simple router to dynamically handle API routes under /api/v1
async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const method = req.method;

  try {
    // Dynamically import the handler based on the path
    const routeHandler = await import(`@/app/api/${path}/route`);
    
    if (routeHandler && typeof routeHandler[method] === 'function') {
      return await routeHandler[method](req);
    } else {
      return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      logger.warn('API route not found', { path, method });
      return new NextResponse(JSON.stringify({ error: 'Not found' }), { status: 404 });
    } else {
      logger.error('API router error', { error, path, method });
      return new NextResponse(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
