import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo-mode';
import { callGeminiAPI } from '@/lib/gemini';
import { GEMINI_MODEL } from '@/lib/gemini/config';

/**
 * Generate Report API Route
 * 
 * Generates a report for an existing case.
 * 
 * In demo mode: Returns JSON immediately with template report (fast path)
 * In live mode: Can stream progress via SSE OR return JSON (based on Accept header)
 * 
 * Returns report generation status and routes to report page when complete.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const prisma = getPrismaClient();

    // Find case
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!case_) {
      return NextResponse.json(
        {
          error: 'Case not found',
          code: 'CASE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Parse metadata
    let metadata: any = {};
    try {
      metadata = JSON.parse(case_.metadata || '{}');
    } catch {
      // Invalid metadata, use defaults
    }

    const {
      decisionContext = '',
      stakeholders = '',
      evidence = '',
      risks = '',
      desiredOutput = 'full',
    } = metadata;

    const title = case_.title;

    // Check if Accept header requests SSE streaming
    const acceptHeader = request.headers.get('accept') || '';
    const wantsStreaming = acceptHeader.includes('text/event-stream');

    // In demo mode, always use fast JSON path (no streaming)
    const shouldUseGemini = !isDemoMode() && !!process.env.GEMINI_API_KEY;
    const useStreaming = wantsStreaming && shouldUseGemini;

    if (useStreaming) {
      // Stream progress via SSE
      return streamReportGeneration(
        prisma,
        caseId,
        title,
        decisionContext,
        stakeholders,
        evidence,
        risks
      );
    } else {
      // Generate report synchronously and return JSON (fast path for demo)
      return await generateReportJSON(
        prisma,
        caseId,
        title,
        decisionContext,
        stakeholders,
        evidence,
        risks
      );
    }
  } catch (error: any) {
    // Log error without leaking secrets
    console.error('Generate report error:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'UNKNOWN',
      name: error?.name || 'Error',
    });

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate report synchronously and return JSON (fast path for demo mode)
 */
async function generateReportJSON(
  prisma: any,
  caseId: string,
  title: string,
  decisionContext?: string,
  stakeholders?: string,
  evidence?: string,
  risks?: string
): Promise<NextResponse> {
  let reportMarkdown: string;
  let mermaidDiagram: string | null = null;
  let tokensUsed = 0;
  let durationMs = 0;

  const shouldUseGemini = !isDemoMode() && !!process.env.GEMINI_API_KEY;

  if (shouldUseGemini) {
    // Use Gemini 3 to generate report
    try {
      const startTime = Date.now();

      // Build prompt from user input
      const prompt = `Generate a comprehensive decision analysis report based on the following information:

Title: ${title}
${decisionContext ? `Decision Context: ${decisionContext}` : ''}
${stakeholders ? `Stakeholders: ${stakeholders}` : ''}
${evidence ? `Evidence/Notes: ${evidence}` : ''}
${risks ? `Risks: ${risks}` : ''}

Please provide:
1. A decision overview section
2. Key evidence section
3. Assumptions section
4. Alternatives considered section
5. Risks identified section
6. A summary

Format the response as markdown with proper headings (## for sections).`;

      const geminiResponse = await callGeminiAPI({
        stepName: 'step6',
        prompt,
        model: GEMINI_MODEL,
      });

      durationMs = Date.now() - startTime;
      tokensUsed = geminiResponse.usageMetadata?.totalTokenCount || 0;

      // Extract markdown from Gemini response
      const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Try to extract markdown and mermaid diagram
      const mermaidMatch = responseText.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch) {
        mermaidDiagram = mermaidMatch[1];
        reportMarkdown = responseText.replace(/```mermaid\n[\s\S]*?\n```/g, '').trim();
      } else {
        reportMarkdown = responseText.trim();
      }

      // Ensure we have content
      if (!reportMarkdown) {
        reportMarkdown = generateTemplateReport(title, decisionContext, stakeholders, evidence, risks);
      }
    } catch (geminiError: any) {
      // Log error without leaking secrets
      console.error('Gemini API error:', {
        message: geminiError?.message || 'Unknown error',
        code: geminiError?.code || 'UNKNOWN',
      });
      // Fallback to template report if Gemini fails
      reportMarkdown = generateTemplateReport(title, decisionContext, stakeholders, evidence, risks);
    }
  } else {
    // Generate template report (demo mode or no API key)
    reportMarkdown = generateTemplateReport(title, decisionContext, stakeholders, evidence, risks);
  }

  // Create report
  await prisma.report.create({
    data: {
      caseId,
      finalNarrativeMarkdown: reportMarkdown,
      mermaidDiagram,
      tokensUsed,
      durationMs,
    },
  });

  // Create placeholder steps (for compatibility with existing UI)
  await prisma.caseStep.createMany({
    data: [
      { caseId, stepNumber: 1, status: 'completed', data: JSON.stringify({ step: 1 }) },
      {
        caseId,
        stepNumber: 2,
        status: 'completed',
        data: JSON.stringify({
          decisionTitle: title,
          decisionDate: new Date().toISOString().split('T')[0],
          decisionMaker: stakeholders?.split(',')[0]?.trim() || 'Unknown',
          decisionStatus: 'PENDING',
          decisionSummary: decisionContext || '',
          rationale: evidence ? evidence.split('\n').filter(Boolean) : [],
          risksIdentified: risks ? risks.split('\n').filter(Boolean) : [],
        }),
      },
      { caseId, stepNumber: 3, status: 'completed', data: JSON.stringify({ step: 3 }) },
      { caseId, stepNumber: 4, status: 'completed', data: JSON.stringify({ step: 4 }) },
      { caseId, stepNumber: 5, status: 'completed', data: JSON.stringify({ step: 5 }) },
      { caseId, stepNumber: 6, status: 'completed', data: JSON.stringify({ step: 6 }) },
    ],
  });

  // Update case status to completed
  await prisma.case.update({
    where: { id: caseId },
    data: { status: 'completed' },
  });

  return NextResponse.json({
    ok: true,
    caseId,
    status: 'completed',
    message: 'Report generated successfully',
  }, { status: 200 });
}

/**
 * Stream report generation progress via SSE (for live Gemini mode)
 */
function streamReportGeneration(
  prisma: any,
  caseId: string,
  title: string,
  decisionContext?: string,
  stakeholders?: string,
  evidence?: string,
  risks?: string
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Send initial event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', message: 'Starting report generation...' })}\n\n`)
        );

        // Update case status to processing
        await prisma.case.update({
          where: { id: caseId },
          data: { status: 'processing' },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'processing' })}\n\n`)
        );

        // Generate report (same logic as JSON path)
        let reportMarkdown: string;
        let mermaidDiagram: string | null = null;
        let tokensUsed = 0;
        let durationMs = 0;

        const startTime = Date.now();

        // Build prompt
        const prompt = `Generate a comprehensive decision analysis report based on the following information:

Title: ${title}
${decisionContext ? `Decision Context: ${decisionContext}` : ''}
${stakeholders ? `Stakeholders: ${stakeholders}` : ''}
${evidence ? `Evidence/Notes: ${evidence}` : ''}
${risks ? `Risks: ${risks}` : ''}

Please provide:
1. A decision overview section
2. Key evidence section
3. Assumptions section
4. Alternatives considered section
5. Risks identified section
6. A summary

Format the response as markdown with proper headings (## for sections).`;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'progress', step: 'calling_gemini', message: 'Calling Gemini API...' })}\n\n`)
        );

        const geminiResponse = await callGeminiAPI({
          stepName: 'step6',
          prompt,
          model: GEMINI_MODEL,
        });

        durationMs = Date.now() - startTime;
        tokensUsed = geminiResponse.usageMetadata?.totalTokenCount || 0;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'progress', step: 'processing_response', message: 'Processing Gemini response...' })}\n\n`)
        );

        // Extract markdown from Gemini response
        const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Try to extract markdown and mermaid diagram
        const mermaidMatch = responseText.match(/```mermaid\n([\s\S]*?)\n```/);
        if (mermaidMatch) {
          mermaidDiagram = mermaidMatch[1];
          reportMarkdown = responseText.replace(/```mermaid\n[\s\S]*?\n```/g, '').trim();
        } else {
          reportMarkdown = responseText.trim();
        }

        // Ensure we have content
        if (!reportMarkdown) {
          reportMarkdown = generateTemplateReport(title, decisionContext, stakeholders, evidence, risks);
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'progress', step: 'saving_report', message: 'Saving report...' })}\n\n`)
        );

        // Create report
        await prisma.report.create({
          data: {
            caseId,
            finalNarrativeMarkdown: reportMarkdown,
            mermaidDiagram,
            tokensUsed,
            durationMs,
          },
        });

        // Create placeholder steps
        await prisma.caseStep.createMany({
          data: [
            { caseId, stepNumber: 1, status: 'completed', data: JSON.stringify({ step: 1 }) },
            {
              caseId,
              stepNumber: 2,
              status: 'completed',
              data: JSON.stringify({
                decisionTitle: title,
                decisionDate: new Date().toISOString().split('T')[0],
                decisionMaker: stakeholders?.split(',')[0]?.trim() || 'Unknown',
                decisionStatus: 'PENDING',
                decisionSummary: decisionContext || '',
                rationale: evidence ? evidence.split('\n').filter(Boolean) : [],
                risksIdentified: risks ? risks.split('\n').filter(Boolean) : [],
              }),
            },
            { caseId, stepNumber: 3, status: 'completed', data: JSON.stringify({ step: 3 }) },
            { caseId, stepNumber: 4, status: 'completed', data: JSON.stringify({ step: 4 }) },
            { caseId, stepNumber: 5, status: 'completed', data: JSON.stringify({ step: 5 }) },
            { caseId, stepNumber: 6, status: 'completed', data: JSON.stringify({ step: 6 }) },
          ],
        });

        // Update case status to completed
        await prisma.case.update({
          where: { id: caseId },
          data: { status: 'completed' },
        });

        // Send completion event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'completed', caseId, status: 'completed', message: 'Report generated successfully' })}\n\n`)
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error: any) {
        // Log error without leaking secrets
        console.error('Stream generation error:', {
          message: error?.message || 'Unknown error',
          code: error?.code || 'UNKNOWN',
        });

        // Send error event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Report generation failed', code: 'GENERATION_ERROR' })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Generate a template report from user input
 * Used when Gemini API is not available or in demo mode
 */
function generateTemplateReport(
  title: string,
  decisionContext?: string,
  stakeholders?: string,
  evidence?: string,
  risks?: string
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `# Decision Trace Report

## Decision Overview
**Title**: ${title}
**Date**: ${date}
**Status**: PENDING REVIEW

## Summary
${decisionContext || 'No decision context provided.'}

## Key Evidence
${evidence ? evidence.split('\n').map(line => `- ${line.trim()}`).join('\n') : '- No evidence provided'}

## Assumptions
- Assumptions based on available information
- Context may be incomplete

## Alternatives
- Alternative options were considered
- Current decision was selected based on available information

## Risks Identified
${risks ? risks.split('\n').map(line => `- ${line.trim()}`).join('\n') : '- No specific risks identified'}

## Stakeholders
${stakeholders ? stakeholders.split(',').map(s => `- ${s.trim()}`).join('\n') : '- Stakeholders not specified'}

---
*This report was generated from user-provided information. For AI-powered analysis, configure GEMINI_API_KEY.*`;
}

