import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface Suggestion {
  value: string;
  type: 'skill' | 'designation' | 'company' | 'location';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const type = searchParams.get('type') as 'skills' | 'designations' | 'companies' | 'locations' | 'general'; // 'general' for mixed search

  if (!query || query.trim().length < 2) { // Require at least 2 characters for suggestions
    return NextResponse.json({ suggestions: [] });
  }

  if (!type) {
    return NextResponse.json({ message: 'Suggestion type is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();
    let suggestions: Suggestion[] = [];
    const searchQuery = `${query}%`; // For LIKE operator

    if (type === 'skills' || type === 'general') {
      const [skillRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT required_skills FROM job_listings WHERE required_skills LIKE ? LIMIT 20`,
        [`%${query}%`] // Search within the comma-separated list
      );
      const allSkills = new Set<string>();
      skillRows.forEach(row => {
        if (row.required_skills) {
          row.required_skills.split(',').forEach((skill: string) => {
            const s = skill.trim();
            if (s.toLowerCase().startsWith(query.toLowerCase())) {
              allSkills.add(s);
            }
          });
        }
      });
      suggestions.push(...Array.from(allSkills).slice(0, 5).map(s => ({ value: s, type: 'skill' } as Suggestion)));
    }

    if (type === 'designations' || type === 'general') {
      const [titleRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT title FROM job_listings WHERE title LIKE ? LIMIT 5`,
        [searchQuery]
      );
      suggestions.push(...titleRows.map(row => ({ value: row.title, type: 'designation' } as Suggestion)));
    }

    if (type === 'companies' || type === 'general') {
      const [companyRows] = await connection.execute<RowDataPacket[]>(
        `(SELECT DISTINCT company_name AS name FROM job_provider_profiles WHERE company_name LIKE ? LIMIT 5)
         UNION
         (SELECT DISTINCT company_name_override AS name FROM job_listings WHERE company_name_override LIKE ? AND company_name_override IS NOT NULL LIMIT 5)`,
        [searchQuery, searchQuery]
      );
      const uniqueCompanies = new Set<string>(companyRows.map(row => row.name));
      suggestions.push(...Array.from(uniqueCompanies).slice(0, 5).map(c => ({ value: c, type: 'company' } as Suggestion)));
    }
    
    if (type === 'locations') { // Specific search for location
      const [locationRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT location FROM job_listings WHERE location LIKE ? AND location IS NOT NULL LIMIT 10`,
        [searchQuery]
      );
      suggestions.push(...locationRows.map(row => ({ value: row.location, type: 'location' } as Suggestion)));
    }

    // Deduplicate suggestions if 'general' type was used and multiple queries ran
    if (type === 'general') {
        const uniqueValues = new Set<string>();
        suggestions = suggestions.filter(suggestion => {
            if (uniqueValues.has(suggestion.value.toLowerCase())) {
                return false;
            }
            uniqueValues.add(suggestion.value.toLowerCase());
            return true;
        }).slice(0, 10); // Limit total general suggestions
    }


    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('API Error fetching suggestions:', error);
    return NextResponse.json({ message: 'Failed to fetch suggestions', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
