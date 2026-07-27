import pg from 'pg';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ====== Parse binary .dat file ======
function parseDat(filePath) {
  const buf = readFileSync(filePath);
  let offset = 0;
  const nameLen = buf.readInt32LE(offset); offset += 4;
  const name = buf.toString('ascii', offset, offset + nameLen); offset += nameLen;
  const contentLen = buf.readInt32LE(offset); offset += 4;
  const content = buf.toString('ascii', offset, offset + contentLen);
  return content;
}

// ====== Parse HTML table ======
function parseHtmlTable(html) {
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/gi);
  if (!rows || rows.length < 2) return { headers: [], records: [] };

  // Parse header row
  const headerCells = rows[0].match(/<td[^>]*>([^<]*)<\/td>/gi);
  if (!headerCells) return { headers: [], records: [] };
  const headers = headerCells.map(c => c.replace(/<[^>]+>/g, '').trim());

  // Parse data rows
  const records = [];
  for (let ri = 1; ri < rows.length; ri++) {
    const cells = rows[ri].match(/<td[^>]*>([^<]*)<\/td>/gi);
    if (!cells) continue;
    const values = cells.map(c => c.replace(/<[^>]+>/g, '').trim());
    const rec = {};
    headers.forEach((h, i) => { rec[h] = i < values.length ? values[i] : ''; });
    records.push(rec);
  }

  return { headers, records };
}

// ====== Column mappings from HTML header names to DB column names ======
const COLUMN_MAPS = {
  cpu: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Chipset (Lookup)': 'chipset',
    'CPU Series': 'series',
    'Frequency': 'frequency',
    'Basic CPU Score (TS)': 'basic_cpu_score',
    'Score to value ratio': 'score_to_value_ratio',
    'Cores': 'cores',
    'Can Overclock': 'can_overclock',
    'Wattage': 'wattage',
    'Voltage': 'voltage',
    'Default Memory Speed': 'default_memory_speed',
    'Thermal Throttling': 'thermal_throttling',
    'Max Freq': 'max_freq',
    '% increase': 'increase',
    'Overclock Basic CPU Score': 'overclock_basic_cpu_score',
    'Overclock CPU score increase': 'overclock_cpu_score_increase',
    'Max Memory Channels': 'max_memory_channels',
    'CPU Socket': 'cpu_socket',
    'Core Clock Multiplier (TS)': 'coreclockmultiplier',
    'Mem Channels Multiplier (TS)': 'memchannelsmultiplier',
    'Mem Clock Multiplier (TS)': 'memclockmultiplier',
    'Final Adjustment (TS)': 'finaladjustment',
  },
  gpu: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Chipset': 'chipset',
    'GPU Benchmark ID': 'gpu_benchmark_id',
    'VRAM (GB)': 'vram_gb',
    'Wattage': 'wattage',
    'Length': 'length',
    'Score to value ratio': 'score_to_value_ratio',
    'Base Core Clock Freq': 'base_core_clock_freq',
    'Base Mem Clock Freq': 'base_mem_clock_freq',
    'Single GPU Graphics Score': 'single_gpu_graphics_score',
    'Double GPU Graphics Score': 'double_gpu_graphics_score',
    'Dual GPU performance increase': 'dual_gpu_performance_increase',
    'GPU % Power Increase': 'gpu_power_increase',
    'GPU max clock': 'gpu_max_clock',
    'GPU max mem clock': 'gpu_max_mem_clock',
    'OC Single GPU score': 'oc_single_gpu_score',
    'OC Double GPU score': 'oc_double_gpu_score',
    'Component Lighting': 'component_lighting',
  },
  ram: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Total Size (GB)': 'total_size_gb',
    'Size each (GB)': 'size_each_gb',
    'Frequency': 'frequency',
    'Voltage': 'voltage',
    'Max Speed': 'max_speed',
    'Component Lighting': 'component_lighting',
  },
  motherboard: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Chipset': 'chipset',
    'CPU Socket': 'cpu_socket',
    'Motherboard Size': 'motherboard_size',
    'Start Base Clock': 'start_base_clock',
    'Default Memory Speed': 'default_memory_speed',
    'Memory Speed Steps': 'memory_speed_steps',
    'Max Memory Speed': 'max_memory_speed',
    'Support SLI': 'support_sli',
    'Support Crossfire': 'support_crossfire',
    'Can Overclock': 'can_overclock',
    'Component Lighting': 'component_lighting',
    'Is DLC': 'is_dlc',
    'DLC Path': 'dlc_path',
    'DLC Asset Name': 'dlc_asset_name',
    'DLC Steam AppId': 'dlc_steam_appid',
  },
  psu: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Size': 'size',
    'Wattage': 'wattage',
    'Modularity': 'modularity',
    'Length': 'length',
    'Component Lighting': 'component_lighting',
  },
  storage: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Size (GB)': 'size_gb',
    'Type': 'type',
    'Speed': 'speed',
    'Includes Heatsink': 'includes_heatsink',
    'Component Lighting': 'component_lighting',
  },
  cases: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Variant Of': 'variant_of',
    'Use For WC Jobs': 'use_for_wc_jobs',
    'DLC': 'dlc',
    'Mini-ITX': 'mini_itx',
    'Micro-ATX': 'micro_atx',
    'S-ATX': 's_atx',
    'E-ATX': 'e_atx',
    'XL-ATX': 'xl_atx',
    'Mini-DTX': 'mini_dtx',
    'SSI-EEB': 'ssi_eeb',
    'SSI-CEB': 'ssi_ceb',
    'Intel NUC': 'intel_nuc',
    'Intel Mini-STX': 'intel_mini_stx',
    'Motherboard Size': 'motherboard_size',
    'Case Size': 'case_size',
    'Is Open Bench': 'is_open_bench',
    'PSU size': 'psu_size',
    'Restricted GPU length': 'restricted_gpu_length',
    'Max GPU length': 'max_gpu_length',
    'Max CPU Fan Height': 'max_cpu_fan_height',
    'Max PSU length': 'max_psu_length',
    'Inherent Cooling': 'inherent_cooling',
    'Component Lighting': 'component_lighting',
    'Is DLC': 'is_dlc',
    'DLC Path': 'dlc_path',
    'DLC Asset Name': 'dlc_asset_name',
    'DLC Steam AppId': 'dlc_steam_appid',
    'DLC WeGame Id': 'dlc_wegame_id',
    'DLC GOG Id': 'dlc_gog_id',
  },
  coolers: {
    'Class': 'class',
    'Manufacturer': 'manufacturer',
    'ID': 'id',
    'Part Name': 'part_name',
    'Price': 'price',
    'Level': 'level',
    'Percent Through': 'percent_through',
    'Type': 'type',
    'No Fan': 'no_fan',
    'AM3+': 'am3',
    'AM4': 'am4',
    'FM2': 'fm2',
    'LGA 1151 (Coffee Lake)': 'lga_1151_coffee_lake',
    'LGA 1151 (Kaby Lake)': 'lga_1151_kaby_lake',
    'LGA 1151 (Skylake)': 'lga_1151_skylake',
    'LGA 1200': 'lga_1200',
    'LGA 2011-V3': 'lga_2011_v3',
    'LGA 2066': 'lga_2066',
    'TR4': 'tr4',
    'sTRX4': 'strx4',
    'CPU Socket List': 'cpu_socket_list',
    'CPU Socket List (OLD)': 'cpu_socket_list_old_kept_for_reference',
    'Height': 'height',
    'Air Flow': 'air_flow',
    'Air Pressure': 'air_pressure',
    'Size': 'size',
    'Slots': 'slots',
    'Component Lighting': 'component_lighting',
  },
};

// ====== File mapping: component -> dat file pattern ======
// Set to specific table name to process only that one, or empty for all
const ONLY_TABLE = process.env.ONLY || '';

const FILES = [
  { table: 'cpu', pattern: 'CPU-sharedassets0.assets-173.dat' },
  { table: 'gpu', pattern: 'GPU-sharedassets0.assets-186.dat' },
  { table: 'ram', pattern: 'RAM-sharedassets0.assets-162.dat' },
  { table: 'motherboard', pattern: 'Motherboard-sharedassets0.assets-188.dat' },
  { table: 'psu', pattern: 'PSU-sharedassets0.assets-165.dat' },
  { table: 'storage', pattern: 'Storage-sharedassets0.assets-183.dat' },
  { table: 'cases', pattern: 'Cases-sharedassets0.assets-167.dat' },
  { table: 'coolers', pattern: 'Coolers-sharedassets0.assets-180.dat' },
];

// ====== Value conversion ======
function sanitize(val) {
  if (typeof val === 'string') return val.replace(/\0/g, '');
  return val;
}

function convertValue(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val).trim().replace(/\0/g, '');
  if (s === '') return null;
  const low = s.toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(low)) return true;
  if (['no', 'false', '0', 'n'].includes(low)) return false;
  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n;
  }
  if (/^-?\d+\.\d+$/.test(s)) {
    const n = parseFloat(s);
    if (!isNaN(n)) return n;
  }
  return s;
}

// ====== Get DB columns for a table ======
async function getTableColumns(tableName) {
  const r = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [tableName]
  );
  return new Set(r.rows.map(c => c.column_name));
}

// ====== Main ======
const PCBS2_DIR = 'C:\\Users\\Roman\\Desktop\\Export\\pcbs2';

async function main() {
  for (const { table, pattern } of FILES) {
    if (ONLY_TABLE && table !== ONLY_TABLE) continue;
    const v2Table = `v2_${table}`;
    console.log(`\n=== Processing ${table} -> ${v2Table} ===`);

    // Get existing DB columns
    const dbCols = await getTableColumns(table);
    console.log(`DB columns: ${[...dbCols].join(', ')}`);

    const filePath = join(PCBS2_DIR, pattern);
    if (!existsSync(filePath)) {
      console.log(`  File not found: ${filePath}`);
      continue;
    }

    // Parse .dat file
    let htmlContent;
    try {
      htmlContent = parseDat(filePath);
    } catch (e) {
      console.log(`  Error parsing .dat: ${e.message}`);
      continue;
    }

    // Parse HTML
    const { headers, records } = parseHtmlTable(htmlContent);
    console.log(`  Records: ${records.length}`);

    // Get column mapping
    const colMap = COLUMN_MAPS[table];
    if (!colMap) {
      console.log(`  No column mapping for ${table}`);
      continue;
    }

    // Transform records
    const insertRecords = [];
    for (const rec of records) {
      // Filter: skip "Dummy" class
      if (String(rec['Class'] || '').toLowerCase() === 'dummy') continue;
      // Filter: must be "In Game" and "Working in game"
      if (String(rec['In Game'] || '').toLowerCase() !== 'yes') continue;
      if (String(rec['Working in game'] || '').toLowerCase() !== 'yes') continue;

      const mapped = {};
      for (const [htmlCol, dbCol] of Object.entries(colMap)) {
        if (dbCols.has(dbCol)) {
          mapped[dbCol] = convertValue(rec[htmlCol]);
        }
      }
      // Only insert if we have at least an id
      if (mapped.id) {
        insertRecords.push(mapped);
      }
    }

    console.log(`  After filtering: ${insertRecords.length} records`);

    if (insertRecords.length === 0) {
      console.log('  No records to insert, skipping');
      continue;
    }

    // Create v2 table if not exists
    await pool.query(`CREATE TABLE IF NOT EXISTS "${v2Table}" (LIKE "${table}" INCLUDING ALL)`);
    // Clear existing data
    await pool.query(`TRUNCATE "${v2Table}"`);
    console.log(`  Table ${v2Table} ensured and truncated`);

    // Batch insert
    const cols = Object.keys(insertRecords[0]);
    const colList = cols.map(c => `"${c}"`).join(', ');
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO "${v2Table}" (${colList}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const rec of insertRecords) {
      try {
        const values = cols.map(c => rec[c] === undefined ? null : rec[c]);
        await pool.query(insertSQL, values);
        inserted++;
      } catch (e) {
        // Skip duplicate key errors and other issues
        if (!e.message.includes('duplicate key')) {
          console.log(`  Error inserting ${rec.id}: ${e.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`  Inserted ${inserted} / ${insertRecords.length} records`);
  }

  await pool.end();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
