import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, documentType, language = 'en' } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing document of type:', documentType);
    console.log('Target language:', language);

    // Use Gemini Pro for advanced document understanding with vision
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert document analyzer and OCR specialist. Your task is to:
1. Accurately extract ALL text from the document image
2. Understand the document structure and context
3. Identify and categorize different fields (name, date of birth, address, ID numbers, academic scores, etc.)
4. Return the data in a structured JSON format

For the extracted data, categorize each field into one of these categories:
- personal: Name, date of birth, gender, father's name, mother's name
- identity: ID numbers (Aadhaar, PAN, passport, voter ID), registration numbers
- contact: Address, phone, email, city, state, pincode
- academic: Grades, marks, subjects, institution names, roll numbers, years

IMPORTANT: 
- Be extremely accurate with numbers, dates, and names
- If text is unclear, include a confidence score (0-100)
- Flag any fields that need user verification
- Extract ALL visible text, even if partially obscured

Respond ONLY with valid JSON in this exact format:
{
  "rawText": "full extracted text from document",
  "documentType": "detected document type",
  "fields": [
    {
      "category": "personal|identity|contact|academic",
      "fieldName": "field name in English",
      "fieldValue": "extracted value",
      "confidence": 95,
      "needsVerification": false,
      "originalLabel": "label as shown in document"
    }
  ],
  "overallConfidence": 90,
  "warnings": ["any warnings or issues detected"]
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this ${documentType || 'document'} image and extract all information. Return structured data in JSON format.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please add credits to continue.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI processing failed: ${errorText}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response received, parsing...');
    
    // Parse the JSON response from AI
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      extractedData = {
        rawText: content,
        documentType: documentType || 'unknown',
        fields: [],
        overallConfidence: 50,
        warnings: ['Could not structure the extracted data properly']
      };
    }

    console.log('Document processed successfully');

    return new Response(JSON.stringify({
      success: true,
      data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
