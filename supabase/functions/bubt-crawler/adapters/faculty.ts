import { fetchWithRetry } from '../core/http.ts';
import type { AdapterResult } from '../types.ts';

const BUBT_BASE = 'https://www.bubt.edu.bd';

function normalizeFacultyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr\.|prof\.|professor|lecturer|mr\.|ms\.|mrs\.|engr\.|engineer)\s+/gi, '')
    .replace(/^(md\.|mohammed|mohammad|muhammad|mst\.)\s+/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEPARTMENT_SLUGS = [
  { name: 'Department of Computer Science & Engineering', slug: 'department-of-computer-science-engineering' },
  { name: 'Department of Data Science & Engineering', slug: 'department-of-data-science-engineering' },
  { name: 'Department of Mathematics & Statistics', slug: 'department-of-mathematics-statistics' },
  { name: 'Department of Electrical & Electronic Engineering', slug: 'department-of-electrical-electronic-engineering' },
  { name: 'Department of Textile Engineering', slug: 'department-of-textile-engineering' },
  { name: 'Department of Civil Engineering', slug: 'department-of-civil-engineering' },
  { name: 'Department of Law & Justice', slug: 'department-of-law-justice' },
  { name: 'Department of English', slug: 'department-of-english' },
  { name: 'Department of Management', slug: 'department-of-management' },
  { name: 'Department of Economics', slug: 'department-of-economics' },
  { name: 'Department of Accounting', slug: 'department-of-accounting' },
  { name: 'Department of Marketing', slug: 'department-of-marketing' },
  { name: 'Department of Finance', slug: 'department-of-finance' },
];

export async function runFacultyAdapter(supabase: any): Promise<AdapterResult> {
  // 1. Fetch departments, existing faculty, and routine slots
  const [deptsRes, facultyRes, routineSlotsRes] = await Promise.all([
    supabase.from('departments').select('id, name, dept_number'),
    supabase.from('faculty').select('*'),
    supabase.from('routine_slots').select('course_code, course_title, teacher_short_code, room, building').limit(5000),
  ]);

  const dbDepts = deptsRes.data ?? [];
  const existingFaculty = facultyRes.data ?? [];
  const routineSlots = routineSlotsRes.data ?? [];

  // Build course, room, and building mappings keyed by uppercase teacher initial
  const coursesByTeacherCode = new Map<string, Set<string>>();
  const roomByTeacherCode = new Map<string, string>();
  const buildingByTeacherCode = new Map<string, string>();

  for (const s of routineSlots) {
    const code = s.teacher_short_code?.trim().toUpperCase();
    if (!code) continue;
    if (!coursesByTeacherCode.has(code)) {
      coursesByTeacherCode.set(code, new Set<string>());
    }
    const label = s.course_title ? `${s.course_code} – ${s.course_title}` : s.course_code;
    if (label) coursesByTeacherCode.get(code)!.add(label);
    if (s.room && !roomByTeacherCode.has(code)) {
      roomByTeacherCode.set(code, s.room.trim());
    }
    if (s.building && !buildingByTeacherCode.has(code)) {
      buildingByTeacherCode.set(code, s.building.trim());
    }
  }

  const deptMap = new Map<string, string>();
  dbDepts.forEach((d: any) => {
    deptMap.set(d.name.toLowerCase().trim(), d.id);
    deptMap.set(d.dept_number.trim(), d.id);
  });

  const byDeptAndExact = new Map<string, any>();
  const byDeptAndNorm = new Map<string, any>();
  const byShortCode = new Map<string, any>();
  const byNormOnly = new Map<string, any>();

  for (const f of existingFaculty) {
    const exactKey = `${f.department_id}::${f.name.toLowerCase().trim()}`;
    const normKey = `${f.department_id}::${normalizeFacultyName(f.name)}`;
    byDeptAndExact.set(exactKey, f);
    byDeptAndNorm.set(normKey, f);
    if (f.short_code) byShortCode.set(f.short_code.toUpperCase(), f);
    byNormOnly.set(normalizeFacultyName(f.name), f);
  }

  let totalScanned = 0;
  let newAdded = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  const rowsToInsert: any[] = [];
  const rowsToUpdate: any[] = [];
  const seenUpdatedIds = new Set<string>();

  // 2. Iterate departments on main site
  for (const d of DEPARTMENT_SLUGS) {
    try {
      const deptUrl = `${BUBT_BASE}/department/${d.slug}/faculty`;
      const deptHtml = await fetchWithRetry(deptUrl, { timeoutMs: 8000, maxRetries: 1 });

      let deptId: string | undefined;
      for (const [key, id] of deptMap.entries()) {
        if (d.name.toLowerCase().includes(key) || key.includes(d.name.toLowerCase())) {
          deptId = id;
          break;
        }
      }
      if (!deptId) continue;

      const cardChunks = deptHtml.split(/class="faculty-card\b/);
      for (let i = 1; i < cardChunks.length; i++) {
        const chunk = cardChunks[i];
        const imgMatch = chunk.match(/<img[^>]+src="([^">]+)"/i);
        const altMatch = chunk.match(/<img[^>]+alt="([^">]+)"/i);
        const nameMatch = chunk.match(/<h3[^>]*class="[^"]*faculty-name[^"]*"[^>]*>([\s\S]*?)<\/h3>/i);
        const name = (nameMatch ? nameMatch[1] : altMatch ? altMatch[1] : '').replace(/<[^>]+>/g, '').trim();
        if (!name) continue;

        const desigMatch = chunk.match(/<p[^>]*class="[^"]*(?:bg-indigo|faculty-designation)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
        let rawDesig = desigMatch ? desigMatch[1].replace(/<[^>]+>/g, '').trim() : 'Lecturer';
        if (rawDesig.includes(' - ')) rawDesig = rawDesig.split(' - ')[0].trim();
        if (rawDesig.includes(' — ')) rawDesig = rawDesig.split(' — ')[0].trim();

        // Skip non-academic administrative/lab staff on faculty rosters
        if (/lab assistant|office assistant|support service|technical assistant|assistant officer/i.test(rawDesig)) {
          continue;
        }

        totalScanned++;
        const linkMatch = chunk.match(/href="([^"]*\/faculty\/profile\/([^"]+))"/i);
        const rawCode = linkMatch ? linkMatch[2]?.trim().replace(/\/+$/, '') : '';
        const shortCode = rawCode ? rawCode.toUpperCase() : null;
        const canonicalProfileUrl = shortCode
          ? `${BUBT_BASE}/department/${d.slug}/faculty/profile/${shortCode}`
          : (linkMatch ? linkMatch[1]?.trim() : null);

        const photoUrl = imgMatch ? imgMatch[1].trim() : null;
        const onLeave = /on leave|study leave|lien/i.test(chunk);
        const isChairman = /chairman|head of/i.test(chunk) || /chairman/i.test(rawDesig);

        const exactKey = `${deptId}::${name.toLowerCase().trim()}`;
        const normKey = `${deptId}::${normalizeFacultyName(name)}`;
        const existing = byDeptAndExact.get(exactKey)
          || byDeptAndNorm.get(normKey)
          || (shortCode ? byShortCode.get(shortCode) : null)
          || byNormOnly.get(normalizeFacultyName(name));

        // Derive active courses taught, room, and building from routine slots
        const mappedCourses = shortCode && coursesByTeacherCode.has(shortCode)
          ? Array.from(coursesByTeacherCode.get(shortCode)!)
          : [];
        const mappedRoom = shortCode && roomByTeacherCode.has(shortCode)
          ? roomByTeacherCode.get(shortCode)
          : null;
        const mappedBuilding = shortCode && buildingByTeacherCode.has(shortCode)
          ? buildingByTeacherCode.get(shortCode)
          : null;

        if (existing) {
          if (seenUpdatedIds.has(existing.id)) continue;
          seenUpdatedIds.add(existing.id);

          const needsShortCode = Boolean(shortCode && existing.short_code !== shortCode);
          const needsProfileUrl = Boolean(
            canonicalProfileUrl &&
            (!existing.profile_url ||
              existing.profile_url.includes('cse.bubt.edu.bd') ||
              existing.profile_url !== canonicalProfileUrl)
          );
          const photoChanged = Boolean(photoUrl && existing.photo_url !== photoUrl);
          const desigChanged = Boolean(rawDesig && existing.designation !== rawDesig);
          const leaveChanged = onLeave !== existing.on_leave;
          const chairmanChanged = isChairman !== existing.is_chairman;
          const coursesNeedUpdate = mappedCourses.length > 0 && (!existing.courses_taught || existing.courses_taught.length === 0);
          const roomNeedsUpdate = Boolean(mappedRoom && (!existing.room_number || existing.room_number !== mappedRoom));
          const buildingNeedsUpdate = Boolean(mappedBuilding && (!existing.building || existing.building !== mappedBuilding));

          if (
            needsShortCode || needsProfileUrl || photoChanged || desigChanged ||
            leaveChanged || chairmanChanged || coursesNeedUpdate || roomNeedsUpdate ||
            buildingNeedsUpdate
          ) {
            rowsToUpdate.push({
              id: existing.id,
              department_id: deptId,
              name: existing.name,
              designation: rawDesig || existing.designation,
              short_code: shortCode || existing.short_code || null,
              photo_url: photoUrl || existing.photo_url || null,
              profile_url: canonicalProfileUrl || existing.profile_url || null,
              on_leave: onLeave,
              is_chairman: isChairman,
              courses_taught: mappedCourses.length > 0 ? mappedCourses : (existing.courses_taught || []),
              room_number: mappedRoom || existing.room_number || null,
              building: mappedBuilding || existing.building || null,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            updatedCount++;
          } else {
            unchangedCount++;
          }
        } else {
          rowsToInsert.push({
            department_id: deptId,
            name,
            designation: rawDesig || 'Lecturer',
            short_code: shortCode || null,
            photo_url: photoUrl || null,
            profile_url: canonicalProfileUrl,
            on_leave: onLeave,
            is_chairman: isChairman,
            courses_taught: mappedCourses,
            room_number: mappedRoom || null,
            building: mappedBuilding || null,
            teaching_areas: [],
            publications: [],
            research_interests: [],
            qualifications: [],
            data_source: 'main_site',
            last_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          newAdded++;
        }
      }
    } catch (_deptErr) {
      // Continue to next department
    }
  }

  // 3. Batch Writes in chunks of 50
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
    await supabase.from('faculty').insert(chunk);
  }

  for (let i = 0; i < rowsToUpdate.length; i += CHUNK_SIZE) {
    const chunk = rowsToUpdate.slice(i, i + CHUNK_SIZE);
    await supabase.from('faculty').upsert(chunk, { onConflict: 'id' });
  }

  return {
    feature: 'faculty',
    scanned: totalScanned,
    added: newAdded,
    updated: updatedCount,
    unchanged: unchangedCount,
    details: {
      departments_scanned: DEPARTMENT_SLUGS.length,
      routine_mapped_teachers: coursesByTeacherCode.size,
      routine_rooms_mapped: roomByTeacherCode.size,
    },
  };
}
