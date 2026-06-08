#!/usr/bin/env node
/**
 * Convert PPSA-style JSON sections/subsections/items into flat JSONL.
 * Usage:
 *   node tools/ppsa-content-adapter.mjs data/doa.json > out/ppsa-items.jsonl
 *
 * Note: PPSA is a doa/wirid dataset, not full mushaf Qur'an. This adapter is
 * included because Hifz Companion can reuse the same content pattern for
 * additional readings or a future Quran dataset with similar fields.
 */
import fs from 'node:fs';
const file = process.argv[2];
if(!file){ console.error('Usage: node tools/ppsa-content-adapter.mjs <data.json>'); process.exit(1); }
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
for(const section of json.sections || []){
  for(const subsection of section.subsections || []){
    for(const item of subsection.items || []){
      const row = {
        id: item.id,
        section: section.title,
        subsection: subsection.title,
        order: item.order,
        arabic: item.arabic_display || item.arabic,
        translation_id: item.translation_id || null,
        source: json.metadata?.title || 'PPSA'
      };
      console.log(JSON.stringify(row));
    }
  }
}
