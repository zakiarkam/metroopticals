import { NextRequest, NextResponse } from 'next/server'
import { reportQuerySchema } from '@/features/reports/validators/reports'
import { generateMonthlyReport } from '@/features/reports/services/report-service'
import { requireAdmin } from '@/lib/middleware/auth'
import { handleError, createSuccessResponse } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const query = reportQuerySchema.parse(Object.fromEntries(searchParams))
    
    const result = await generateMonthlyReport(query)
    
    if (result.type === 'json') {
      return createSuccessResponse(result.data)
    }

    if (result.type === 'excel') {
      return new NextResponse(result.data as BodyInit, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }

    if (result.type === 'pdf') {
      return new NextResponse(result.data as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }

    throw new Error('Unsupported report format')
  } catch (error) {
    return handleError(error)
  }
}
