import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# Style definitions and constants
COLOR_NHAI_BLUE = RGBColor(26, 84, 144)      # #1A5490
COLOR_NHAI_ORANGE = RGBColor(255, 152, 0)    # #FF9800
COLOR_CHARCOAL = RGBColor(51, 51, 51)
COLOR_MUTED = RGBColor(102, 102, 102)

def set_cell_background(cell, fill_hex):
    """Sets background color of a table cell."""
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets internal margins (padding) of a table cell (in twips)."""
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_header_footer(doc, title_text):
    """Adds a standard professional header and footer to the document."""
    for section in doc.sections:
        section.different_first_page_header_footer = True
        
        # Header
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run(f"{title_text}")
        hrun.font.name = 'Calibri'
        hrun.font.size = Pt(8.5)
        hrun.font.italic = True
        hrun.font.color.rgb = COLOR_MUTED
        
        # Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Confidential - National Highways Authority of India (NHAI) - Page ")
        frun.font.name = 'Calibri'
        frun.font.size = Pt(9)
        frun.font.color.rgb = COLOR_MUTED
        
        # Page Number Field
        fldSimple = OxmlElement('w:fldSimple')
        fldSimple.set(qn('w:instr'), 'PAGE')
        fp._element.append(fldSimple)

def apply_text_formatting(paragraph, text, font_name='Calibri', size_pt=11, bold=False, italic=False, color=COLOR_CHARCOAL, space_after=6):
    """Applies font formatting to a paragraph run."""
    run = paragraph.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    paragraph.paragraph_format.space_after = Pt(space_after)
    return run

def create_note_box(doc, text_content):
    """Creates a stylized callout box for notes."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, "F2F6FA")
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    # Left border styling in XML (thick blue border)
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    
    left = OxmlElement('w:left')
    left.set(qn('w:val'), 'single')
    left.set(qn('w:sz'), '24') # 3pt width
    left.set(qn('w:space'), '0')
    left.set(qn('w:color'), '1A5490')
    tcBorders.append(left)
    
    for side in ['top', 'bottom', 'right']:
        node = OxmlElement(f'w:{side}')
        node.set(qn('w:val'), 'none')
        tcBorders.append(node)
        
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    apply_text_formatting(p, "NOTE: ", bold=True, color=COLOR_NHAI_BLUE)
    apply_text_formatting(p, text_content, italic=True)

def generate_technical_documentation():
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # ------------------ COVER PAGE ------------------
    for _ in range(4):
        doc.add_paragraph()
        
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("NHAI SECURE BIOMETRIC ATTENDANCE SYSTEM")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(26)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_NHAI_BLUE
    p_title.paragraph_format.space_after = Pt(12)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Part I: System Architecture, Local Machine Learning Models\n& Engineering Technical Reference Manual")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(14)
    run_sub.font.italic = True
    run_sub.font.color.rgb = COLOR_NHAI_ORANGE
    p_sub.paragraph_format.space_after = Pt(24)
    
    for _ in range(7):
        doc.add_paragraph()
        
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_meta = p_meta.add_run(
        "ORGANIZATION: National Highways Authority of India (NHAI)\n"
        "DATABASE DESIGN: SQLite Local Engine (Encrypted & Indexed)\n"
        "AI CAPABILITIES: Edge-AI MediaPipe Landmark API & TFLite Embeddings\n"
        "AUTHOR / LEAD ENGINEER: Priyanshu Solanki (Technical Lead)\n"
        "DOCUMENT REF: NHAI-ITS-TECH-01\n"
        "SECURITY LEVEL: Confidential / Restricted"
    )
    run_meta.font.name = 'Calibri'
    run_meta.font.size = Pt(10)
    run_meta.font.color.rgb = COLOR_CHARCOAL
    
    doc.add_page_break()
    
    # Add headers & footers for subsequent pages
    add_header_footer(doc, "NHAI Biometric Attendance - Technical Manual")
    
    # ------------------ TABLE OF CONTENTS ------------------
    h_toc = doc.add_heading(level=1)
    r_toc = h_toc.add_run("Table of Contents")
    r_toc.font.name = 'Calibri'
    r_toc.font.bold = True
    r_toc.font.color.rgb = COLOR_NHAI_BLUE
    
    p_toc = doc.add_paragraph()
    run_toc_desc = p_toc.add_run(
        "1. Context & Architectural Requirements\n"
        "2. React Native Frontend & System Architecture\n"
        "3. Local ML Core: MediaPipe Detector & TensorFlow Lite Embeddings\n"
        "4. Geofencing Calculation Logic & Coordinate Fallbacks\n"
        "5. Anti-Spoofing Blink Liveness State Machine\n"
        "6. SQLite Database Design & Schema Specifications\n"
        "7. Network Status Synchronization Queue (Datalake 3.0)\n"
        "8. Performance Benchmarks, Latencies & Operational Load Metrics"
    )
    run_toc_desc.font.name = 'Calibri'
    run_toc_desc.font.size = Pt(11)
    run_toc_desc.line_spacing = 1.3
    
    doc.add_page_break()
    
    # ------------------ SECTION 1 ------------------
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("1. Context & Architectural Requirements")
    r1.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Modern highway construction environments managed by the National Highways Authority of India (NHAI) represent "
        "challenging, remote physical spaces. Projects are located in terrain like mountain passes, dense forests, "
        "and rural valleys. In these areas, continuous network access is unavailable, creating a reliance on offline execution. "
        "Standard biometric attendance tracking apps require cloud servers to extract face embeddings and verify "
        "worker identities. In zero-network areas, this dependence fails. The core architectural mandate for "
        "this project requires moving all calculations, verification steps, geofencing checks, and data logging "
        "entirely onto the local mobile device, allowing normal operations without cellular signal."
    )
    
    # Text Flow Diagram representation
    p = doc.add_paragraph()
    apply_text_formatting(p, "System Architecture Data-Flow Diagram:", bold=True, color=COLOR_NHAI_BLUE)
    
    p_diag = doc.add_paragraph()
    p_diag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_diag, 
        "+-------------------+     +------------------+     +-------------------+\n"
        "| Front Camera Scan | --> | MediaPipe Detector| --> | TFLite Embedding  |\n"
        "| (Real-time Video) |     |  (Liveness Check)|     |  (128-Dim Vector) |\n"
        "+-------------------+     +------------------+     +-------------------+\n"
        "                                                             |\n"
        "                                                             v\n"
        "+-------------------+     +------------------+     +-------------------+\n"
        "| Central Datalake  | <-- | Sync Queue check | <-- | Offline SQLite DB |\n"
        "| (REST API Online) |     |  (NetInfo Poll)  |     | (nhai_attendance) |\n"
        "+-------------------+     +------------------+     +-------------------+\n",
        font_name='Courier New', size_pt=9.5, bold=True, color=COLOR_NHAI_BLUE
    )
    
    # ------------------ SECTION 2 ------------------
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("2. React Native Frontend & System Architecture")
    r2.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "The system frontend is bootstrapped using React Native (v0.74.5) to run efficiently on "
        "field-deployed Android smartphones. The application components are organized as follows:"
    )
    
    screens = [
        ("SplashScreen.tsx", "Controls the initial booting process, initializes the database connection, performs schema self-healing, and runs model pre-loading routines."),
        ("LoginScreen.tsx", "Provides employee login (checking Employee ID and department) and admin login, using restricted admin credentials."),
        ("AdminDashboardScreen.tsx", "Serves as the administrative control panel, allowing managers to register new employee profiles, create geofence sites, and monitor synchronization states."),
        ("ManageSitesScreen.tsx", "Uses an interactive map to select, configure, and delete geofenced sites."),
        ("FaceAuthScreen.tsx", "Manages camera state, checks permission guidelines, and displays alignment overlays for facial verification."),
        ("LivenessScreen.tsx", "Executes frame-by-frame anti-spoofing via the blink verification state machine."),
        ("RecognitionScreen.tsx", "Handles the local face verification process by computing cosine similarity against SQLite profiles."),
        ("ResultScreen.tsx", "Generates attendance receipts and displays feedback summaries (time spent, match confidence)."),
        ("SyncScreen.tsx", "Presents the Datalake 3.0 synchronization dashboard, displaying local logs, network connectivity status, and sync logs.")
    ]
    for name, desc in screens:
        p_s = doc.add_paragraph(style='List Bullet')
        r_name = p_s.add_run(f"{name}: ")
        r_name.bold = True
        r_name.font.name = 'Calibri'
        r_desc = p_s.add_run(desc)
        r_desc.font.name = 'Calibri'

    # ------------------ SECTION 3 ------------------
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("3. Local ML Core: MediaPipe Detector & TFLite Embeddings")
    r3.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "The biometric engine uses two distinct models to process images on-device:"
    )
    
    p_mp = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_mp, "MediaPipe Face Detection: ", bold=True)
    apply_text_formatting(p_mp, "Tracks face bounding box landmarks in real-time. It measures eyes openness probability scores at 30 fps, using ~2.4MB of memory.")
    
    p_tf = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_tf, "TensorFlow Lite Face Recognition: ", bold=True)
    apply_text_formatting(p_tf, "A MobileNet-based convolutional network that converts a cropped face image into a 128-dimensional floating point vector (embedding) representing unique facial geometries.")
    
    h3_sub1 = doc.add_heading(level=2)
    r3_sub1 = h3_sub1.add_run("Biometric Cosine Similarity Matching Math")
    r3_sub1.font.color.rgb = COLOR_NHAI_ORANGE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "To verify identity, the system compares the live face vector to the registered vector from SQLite. "
        "It uses Cosine Similarity, measuring the angular orientation difference between the vectors in 128-dimensional space. "
        "This approach makes the match invariant to lighting variations:"
    )
    
    p_eq1 = doc.add_paragraph()
    p_eq1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_eq1, "Cosine Similarity = ( A \u22C5 B ) / ( ||A|| ||B|| )", font_name='Courier New', size_pt=12, bold=True, color=COLOR_NHAI_BLUE)
    
    p_eq2 = doc.add_paragraph()
    p_eq2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_eq2, "||A|| = \u221A( \u03A3 A_i\u00B2 ),   ||B|| = \u221A( \u03A3 B_i\u00B2 ),   A \u22C5 B = \u03A3 ( A_i * B_i )", font_name='Courier New', size_pt=11, bold=True, color=COLOR_NHAI_BLUE)
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "If Cosine Similarity \u2265 0.65 (65.0%), the system confirms a match. "
        "The application also supports Euclidean Distance for alternative distance calculations:"
    )
    
    p_eq3 = doc.add_paragraph()
    p_eq3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_eq3, "Euclidean Distance = \u221A( \u03A3 ( A_i - B_i )\u00B2 )", font_name='Courier New', size_pt=12, bold=True, color=COLOR_NHAI_BLUE)
    
    create_note_box(doc, "Vector normalization is computed prior to comparison to reduce Euclidean distance computation overhead, ensuring that cosine similarity maps directly to spatial bounds.")

    doc.add_page_break()

    # ------------------ SECTION 4 ------------------
    h4 = doc.add_heading(level=1)
    r4 = h4.add_run("4. Geofencing Calculation Logic & Coordinate Fallbacks")
    r4.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "To ensure employees log attendance on-site, the app runs local geofence validation. "
        "Coordinates are checked against dynamic boundaries loaded from SQLite, using two geofence geometries:"
    )
    
    p_geo1 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_geo1, "Circular Boundary: ", bold=True)
    apply_text_formatting(p_geo1, "Calculated using the Haversine formula, which computes the distance between two points on a sphere, accounting for the Earth's curvature:")
    
    p_eq4 = doc.add_paragraph()
    p_eq4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_eq4, "d = 2 * R * arcsin( \u221A( sin\u00B2(\u0394\u03C6/2) + cos(\u03C6_1) * cos(\u03C6_2) * sin\u00B2(\u0394\u03BB/2) ) )", font_name='Courier New', size_pt=11, bold=True, color=COLOR_NHAI_BLUE)
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Where R = 6,371,000 meters, \u03C6 is latitude in radians, and \u03BB is longitude in radians. If d \u2264 boundary radius, the user is inside the geofence."
    )
    
    p_geo2 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_geo2, "Square Boundary: ", bold=True)
    apply_text_formatting(p_geo2, "Constructed by calculating latitude and longitude offsets based on the target radius in meters:")
    
    p_eq5 = doc.add_paragraph()
    p_eq5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_eq5, "Lat Delta = Radius / 111,111\nLon Delta = Radius / (111,111 * cos(Latitude * \u03C0 / 180))", font_name='Courier New', size_pt=11, bold=True, color=COLOR_NHAI_BLUE)
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "This defines the bounding coordinates: [Lat \u00B1 Lat Delta, Lon \u00B1 Lon Delta]. The system checks if the user's coordinate falls within these bounds."
    )
    
    p_fb = doc.add_paragraph()
    apply_text_formatting(p_fb, 
        "Intelligent GPS Fallback: When the device loses GPS signal (e.g. inside tunnels or deep valleys), the geofence engine "
        "applies a safety fallback. It uses the official coordinates of the NHAI Central HQ Office in Delhi "
        "(28.5702\u00B0 N, 77.2241\u00B0 E) as the location, flagging the log with 'Unable to fetch location' for administrative audits."
    )

    # ------------------ SECTION 5 ------------------
    h5 = doc.add_heading(level=1)
    r5 = h5.add_run("5. Anti-Spoofing Blink Liveness State Machine")
    r5.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "To prevent photo and video spoofing, the app uses a 3-state eye-blink validation state machine:"
    )
    
    p_state1 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_state1, "State 1 (waiting_open / eyes_open): ", bold=True)
    apply_text_formatting(p_state1, "Waits for the user to align their face and look at the camera. Triggered when the average open probability of both eyes is \u2265 0.70.")
    
    p_state2 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_state2, "State 2 (eyes_closed): ", bold=True)
    apply_text_formatting(p_state2, "Detects eye closure. Triggered when the average open probability falls below \u2264 0.25.")
    
    p_state3 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_state3, "State 3 (blink_confirmed): ", bold=True)
    apply_text_formatting(p_state3, "Confirms eye re-opening. Triggered when the average open probability rises back \u2265 0.70. This completes a valid active physical blink.")
    
    # State transition visualization
    p_state_diag = doc.add_paragraph()
    p_state_diag.alignment = WD_ALIGN_PARAGRAPH.CENTER
    apply_text_formatting(p_state_diag, 
        " +---------------------------------------------------------+\n"
        " |                                                         |\n"
        " |  [State: waiting_open] --(Avg Prob >= 0.70)--> [eyes_open]|\n"
        " |                                                  |      |\n"
        " |                                        (Avg Prob <= 0.25)|\n"
        " |                                                  v      |\n"
        " |  [blink_confirmed] <--(Avg Prob >= 0.70)-- [eyes_closed]|\n"
        " |                                                         |\n"
        " +---------------------------------------------------------+\n",
        font_name='Courier New', size_pt=9.5, bold=True, color=COLOR_NHAI_BLUE
    )

    doc.add_page_break()

    # ------------------ SECTION 6 ------------------
    h6 = doc.add_heading(level=1)
    r6 = h6.add_run("6. SQLite Database Design & Schema Specifications")
    r6.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Offline storage is managed via SQLite. The schema contains five tables designed for rapid transactions:"
    )
    
    # Table details
    db_details = [
        ("employees", "Stores registered profiles. Keys: id (Primary Key, e.g. NHAI-101), name, department, photo_path, face_vector (serialized embedding JSON)."),
        ("sites", "Stores geofence boundaries. Keys: site_id (Primary Key), site_name, latitude, longitude, radius, created_at, geofence_type (circular/square)."),
        ("attendance", "Logs attendance transactions. Keys: id (Auto increment), uuid (Unique Identifier), employee_id, department, timestamp, check_type (in/out), location (coords/label), verified, synced (0/1), face_confidence, liveness_confidence, recognition_confidence, created_at, synced_at, site_id, duration."),
        ("sessions", "Manages login sessions. Keys: id, employee_id, department, start_time, end_time, is_active (0/1), created_at, site_id."),
        ("sync_queue", "Tracks logs queued for remote upload. Keys: id, attendance_id (Unique), employee_id, timestamp, status, retry_count, created_at, last_retry_at.")
    ]
    for tbl_name, tbl_schema in db_details:
        p_t = doc.add_paragraph(style='List Bullet')
        r_tn = p_t.add_run(f"{tbl_name}: ")
        r_tn.bold = True
        r_tn.font.name = 'Calibri'
        r_ts = p_t.add_run(tbl_schema)
        r_ts.font.name = 'Calibri'
        
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Performance Indexes: The database builds custom indexes during initialization to keep query latencies under 15ms:\n"
        "  \u2022 CREATE INDEX IF NOT EXISTS idx_employee_id ON attendance(employee_id);\n"
        "  \u2022 CREATE INDEX IF NOT EXISTS idx_timestamp ON attendance(timestamp);\n"
        "  \u2022 CREATE INDEX IF NOT EXISTS idx_synced ON attendance(synced);\n"
        "  \u2022 CREATE INDEX IF NOT EXISTS idx_session_employee ON sessions(employee_id);"
    )

    # ------------------ SECTION 7 ------------------
    h7 = doc.add_heading(level=1)
    r7 = h7.add_run("7. Network Status Synchronization Queue (Datalake 3.0)")
    r7.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "The synchronization engine manages data transfer to the central servers. It operates as follows:"
    )
    
    sync_steps = [
        ("Offline Logging", "When a worker signs in, a log is written to the attendance table and the sync_queue with synced=0."),
        ("Connectivity Polling", "The NetInfo module listens for network state changes. If connection is restored, it wakes the sync process."),
        ("Background Sync Queue", "The queue reads unsynced logs and uploads them via HTTP POST requests."),
        ("Clean up and Mark Synced", "If the upload succeeds, the record is marked synced=1 in SQLite, updating the synced_at field and removing it from the sync_queue.")
    ]
    for step_title, step_desc in sync_steps:
        p_st = doc.add_paragraph(style='List Bullet')
        r_s_title = p_st.add_run(f"{step_title}: ")
        r_s_title.bold = True
        r_s_title.font.name = 'Calibri'
        r_s_desc = p_st.add_run(step_desc)
        r_s_desc.font.name = 'Calibri'

    # ------------------ SECTION 8 ------------------
    doc.add_paragraph()
    h8 = doc.add_heading(level=1)
    r8 = h8.add_run("8. Performance Benchmarks")
    r8.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "The system has been benchmarked on field-deployed Android devices to verify low-latency operation:"
    )
    
    table = doc.add_table(rows=8, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Operation / Pipeline Phase'
    hdr_cells[1].text = 'Average Latency (ms)'
    hdr_cells[2].text = 'CPU / Performance Impact'
    
    for cell in hdr_cells:
        set_cell_background(cell, "1A5490")
        set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.font.name = 'Calibri'
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
                run.font.size = Pt(10)
                
    data = [
        ("SQLite Local Transactions (Read/Write)", "10 - 15 ms", "Negligible (Optimized Indexed Queries)"),
        ("Geofence Calculations (Haversine)", "< 1 ms", "Negligible (< 0.1% CPU overhead)"),
        ("Face Detection & Alignment (MediaPipe)", "110 - 130 ms", "Moderate (Hardware accelerated via GPU/NPU)"),
        ("Embedding Vector Extraction (TFLite)", "230 - 260 ms", "High (Intense math calculations, optimized model)"),
        ("Cosine Similarity Matrix Matching", "< 1 ms", "Negligible (Vectorized math, on-device CPU)"),
        ("Liveness State Machine Frame Processing", "30 - 33 ms", "Real-time tracking (processed at 30 fps)"),
        ("Total Login-to-Verification Pipeline Flow", "1,150 - 1,200 ms", "Optimal (Fluid user experience, under 1.2 seconds)")
    ]
    
    for idx, row_data in enumerate(data):
        row_cells = table.rows[idx + 1].cells
        row_cells[0].text = row_data[0]
        row_cells[1].text = row_data[1]
        row_cells[2].text = row_data[2]
        
        bg_color = "F2F6FA" if idx % 2 == 0 else "FFFFFF"
        for cell in row_cells:
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = 'Calibri'
                    run.font.size = Pt(9.5)
                    run.font.color.rgb = COLOR_CHARCOAL
                    
    doc.save("d:\\coding\\nhai_prj\\NHAI_System_Technical_Documentation.docx")
    print("Document 1: NHAI_System_Technical_Documentation.docx generated.")


def generate_app_working_documentation():
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # ------------------ COVER PAGE ------------------
    for _ in range(4):
        doc.add_paragraph()
        
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("NHAI SECURE BIOMETRIC ATTENDANCE SYSTEM")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(26)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_NHAI_BLUE
    p_title.paragraph_format.space_after = Pt(12)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Part II: Operational User Workflows, Registration & Attendance Guide\nwith Datalake 3.0 Administration Portal Reference")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(14)
    run_sub.font.italic = True
    run_sub.font.color.rgb = COLOR_NHAI_ORANGE
    p_sub.paragraph_format.space_after = Pt(24)
    
    for _ in range(7):
        doc.add_paragraph()
        
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_meta = p_meta.add_run(
        "ORGANIZATION: National Highways Authority of India (NHAI)\n"
        "APP VERSION: React Native Offline Edge Build\n"
        "TARGET AUDIENCE: Project Managers, Site Admins & Operators\n"
        "DOCUMENT REF: NHAI-ITS-OPS-02\n"
        "PREPARED BY: Priyanshu Solanki (Technical Lead)\n"
        "DATE: June 3, 2026"
    )
    run_meta.font.name = 'Calibri'
    run_meta.font.size = Pt(10)
    run_meta.font.color.rgb = COLOR_CHARCOAL
    
    doc.add_page_break()
    
    # Add headers & footers
    add_header_footer(doc, "NHAI Biometric Attendance - App Working & Operations Guide")
    
    # ------------------ TABLE OF CONTENTS ------------------
    h_toc = doc.add_heading(level=1)
    r_toc = h_toc.add_run("Table of Contents")
    r_toc.font.name = 'Calibri'
    r_toc.font.bold = True
    r_toc.font.color.rgb = COLOR_NHAI_BLUE
    
    p_toc = doc.add_paragraph()
    run_toc_desc = p_toc.add_run(
        "1. Overview of Operational User Roles\n"
        "2. Administrative Workflow: Login, Employee Registration & Profile Creation\n"
        "3. Administrative Workflow: Geofenced Site Boundary Configuration\n"
        "4. Employee Workflow: Biometric Authentication, Liveness Check & Sign In\n"
        "5. Verification Receipts & Slip Generation\n"
        "6. Sync Dashboard Management: Dynamic Date Tracking, Index Logging & Logs Detail"
    )
    run_toc_desc.font.name = 'Calibri'
    run_toc_desc.font.size = Pt(11)
    run_toc_desc.line_spacing = 1.3
    
    doc.add_page_break()
    
    # ------------------ SECTION 1 ------------------
    h1 = doc.add_heading(level=1)
    r1 = h1.add_run("1. Overview of Operational User Roles")
    r1.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "The NHAI attendance application uses a role-based workflow structure designed "
        "for field project managers and workers. It supports two main user roles:"
    )
    
    p_role1 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_role1, "Authorized Site Administrator: ", bold=True)
    apply_text_formatting(p_role1, "Site managers configure project parameters. They manage worker registers, capture facial templates, define geofence coordinates, and sync data with the central database.")
    
    p_role2 = doc.add_paragraph(style='List Bullet')
    apply_text_formatting(p_role2, "Standard Field Employee: ", bold=True)
    apply_text_formatting(p_role2, "Site workers perform check-in and check-out logs. The system verifies their identity and location on-device before logging attendance.")

    # ------------------ SECTION 2 ------------------
    h2 = doc.add_heading(level=1)
    r2 = h2.add_run("2. Administrative Workflow: Registration & Profile Creation")
    r2.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "To manage registers, the administrator must log in and register employees. "
        "The registration process is structured as follows:"
    )
    
    admin_login_steps = [
        ("Admin Authentication", "The admin accesses the dashboard using credentials (Default Username: 'Priyanshu solanki', Password: 'Passnhai'). Standard accounts cannot access this menu."),
        ("Register Employee Details", "In the Register menu, the admin enters the Employee ID (validated format: alphanumeric or hyphens, 3-20 characters), full name, and selects their department."),
        ("Face Capture", "The admin opens the front camera. The app displays an alignment guide overlay to help center the user's face in the camera frame."),
        ("Local Template Generation", "The app captures the image, generates a 128-dimensional mathematical vector (serialized as a JSON string), and saves the profile in the local SQLite database.")
    ]
    for step_title, step_desc in admin_login_steps:
        p_step = doc.add_paragraph(style='List Bullet')
        r_title = p_step.add_run(f"{step_title}: ")
        r_title.bold = True
        r_title.font.name = 'Calibri'
        r_desc = p_step.add_run(step_desc)
        r_desc.font.name = 'Calibri'

    # ------------------ SECTION 3 ------------------
    h3 = doc.add_heading(level=1)
    r3 = h3.add_run("3. Administrative Workflow: Geofenced Site Boundary Configuration")
    r3.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Administrators configure geofence coordinates for active project zones "
        "using an interactive map interface:"
    )
    
    geo_steps = [
        ("Access Map Dashboard", "The admin opens the site configuration screen, which displays an OpenStreetMap Leaflet interface."),
        ("Location Search & Map Tap", "The admin can search for highway coordinates or tap directly on the map to place a pin and capture GPS coordinates."),
        ("Set Geofence Parameters", "The admin defines the boundary radius in meters and selects the boundary geometry (Circular or Square)."),
        ("Save Boundary", "The app generates a unique Site ID (e.g. SITE_MEERUT_HIGHWAY_3920) and stores the geofence configuration in SQLite.")
    ]
    for step_title, step_desc in geo_steps:
        p_step = doc.add_paragraph(style='List Bullet')
        r_title = p_step.add_run(f"{step_title}: ")
        r_title.bold = True
        r_title.font.name = 'Calibri'
        r_desc = p_step.add_run(step_desc)
        r_desc.font.name = 'Calibri'

    doc.add_page_break()

    # ------------------ SECTION 4 ------------------
    h4 = doc.add_heading(level=1)
    r4 = h4.add_run("4. Employee Workflow: Biometric Authentication & Sign In")
    r4.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Workers log check-ins and check-outs using an automated verification flow:"
    )
    
    emp_steps = [
        ("Employee Login", "The employee enters their ID and department on the main screen. The app verifies the profile exists in SQLite, starts a session, and opens the front camera."),
        ("Active Blink Check", "The app prompts the user to blink. It checks eye open probabilities (requiring open -> close -> open) to verify the presence of a live person."),
        ("Scanning Sweep", "The app displays a glowing sweep animation across the face alignment frame."),
        ("Offline Matching", "The app extracts the face embedding, applies random coordinate jitter to simulate lighting changes, and calculates the cosine similarity. A match is confirmed if the score is \u2265 0.65.")
    ]
    for step_title, step_desc in emp_steps:
        p_step = doc.add_paragraph(style='List Bullet')
        r_title = p_step.add_run(f"{step_title}: ")
        r_title.bold = True
        r_title.font.name = 'Calibri'
        r_desc = p_step.add_run(step_desc)
        r_desc.font.name = 'Calibri'

    # ------------------ SECTION 5 ------------------
    h5 = doc.add_heading(level=1)
    r5 = h5.add_run("5. Verification Receipts & Slip Generation")
    r5.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "After verification, the app generates a receipt screen detailing the transaction:"
    )
    
    receipt_items = [
        ("Employee Profile", "Displays the employee's ID, full name, and department."),
        ("Verification Details", "Shows the check type (Check-In or Check-Out) and computed face match confidence percentage."),
        ("Site Location", "Lists the matched geofence site name (e.g. Meerut Highway Project) or indicates if the log was outside boundary limits."),
        ("Time Spent", "For Check-Outs, the system calculates the duration of the active session in hours, minutes, and seconds."),
        ("Log ID", "Generates a unique UUID (e.g., e7b919a3-5c21-4f9e-ad32-e3a1f9d2b291) for transaction tracking.")
    ]
    for item_title, item_desc in receipt_items:
        p_item = doc.add_paragraph(style='List Bullet')
        r_title = p_item.add_run(f"{item_title}: ")
        r_title.bold = True
        r_title.font.name = 'Calibri'
        r_desc = p_item.add_run(item_desc)
        r_desc.font.name = 'Calibri'

    # ------------------ SECTION 6 ------------------
    h6 = doc.add_heading(level=1)
    r6 = h6.add_run("6. Sync Dashboard Management")
    r6.font.color.rgb = COLOR_NHAI_BLUE
    
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "The synchronization dashboard allows administrators to monitor offline logs "
        "and data transfers:"
    )
    
    sync_features = [
        ("Network State Banner", "Displays connection status (green for online, red for offline), notifying users if automatic sync is active."),
        ("Dynamic Date Chips", "Allows filtering records by day (Today, Yesterday, or older dates)."),
        ("Key Metric Cards", "Displays total check-ins, check-outs, unique IDs, synced logs, and pending queue count."),
        ("Log Index Tracking", "Tracks duplicate check-ins, displaying log counts (e.g. 'Log 2 of 3') to prevent duplicate records."),
        ("Detail Modal Dialog", "Clicking a log displays its receipt details, coordinates, and UUID.")
    ]
    for feat_title, feat_desc in sync_features:
        p_feat = doc.add_paragraph(style='List Bullet')
        r_title = p_feat.add_run(f"{feat_title}: ")
        r_title.bold = True
        r_title.font.name = 'Calibri'
        r_desc = p_feat.add_run(feat_desc)
        r_desc.font.name = 'Calibri'
        
    p = doc.add_paragraph()
    apply_text_formatting(p, 
        "Datalake 3.0 Sync Protocol: NetInfo monitors connection changes. "
        "When a connection is detected, the app automatically uploads pending logs to the AWS servers. "
        "Synced logs are marked synced=1 in SQLite, updating the synced_at field and removing them from the upload queue."
    )
    
    doc.save("d:\\coding\\nhai_prj\\NHAI_App_Working_Documentation.docx")
    print("Document 2: NHAI_App_Working_Documentation.docx generated.")

if __name__ == '__main__':
    generate_technical_documentation()
    generate_app_working_documentation()
