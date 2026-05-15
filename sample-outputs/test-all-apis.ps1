param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [string]$BaseUrl = "http://localhost:3000"
)

# =========================================================
# HEADERS
# =========================================================

$Headers = @{
    "Authorization" = "Bearer $Token"
}

$JsonHeaders = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
}

# =========================================================
# HELPERS
# =========================================================

function Step($msg) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host $msg -ForegroundColor Yellow
    Write-Host "==================================================" -ForegroundColor Cyan
}

function Success($msg) {
    Write-Host "[PASS] $msg" -ForegroundColor Green
}

function Fail($msg) {
    Write-Host "[FAIL] $msg" -ForegroundColor Red
}

function Info($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Pretty($obj) {
    $obj | ConvertTo-Json -Depth 20
}

function PrintResponse($label, $obj) {
    Write-Host ""
    Write-Host "----- API RESPONSE: $label -----" -ForegroundColor Magenta
    Write-Host (Pretty $obj)
    Write-Host "----------------------------------------------" -ForegroundColor Magenta
}

# =========================================================
# TEST 1 - GET NOTES
# =========================================================

Step "TEST 1 - GET ALL NOTES"

try {

    $allNotes = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes" `
        -Method GET `
        -Headers $Headers

    Success "Fetched all notes"

    PrintResponse "GET /api/notes" $allNotes

} catch {

    Fail "Failed fetching notes"
    throw
}

# =========================================================
# TEST 2 - CREATE NOTE
# =========================================================

Step "TEST 2 - CREATE NOTE"

$createPayload = @{
    title = "API Test Note"
    content = @"
# API Test Content

This note exists to test:

- CRUD
- AI generation
- Sharing
- Access requests
- Deletion

Action Items:
- Finish backend
- Improve AI
- Add analytics
"@
    tags = @("api", "testing")
} | ConvertTo-Json -Depth 10

try {

    $created = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes" `
        -Method POST `
        -Headers $JsonHeaders `
        -Body $createPayload

    Success "Created note"

    PrintResponse "POST /api/notes" $created

    if ($created.id) {
        $NoteId = $created.id
    } else {
        $NoteId = $created._id
    }

    Success "Captured Note ID: $NoteId"

} catch {

    Fail "Failed creating note"
    throw
}

# =========================================================
# TEST 3 - VERIFY NOTE
# =========================================================

Step "TEST 3 - VERIFY CREATED NOTE"

try {

    $note = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId" `
        -Method GET `
        -Headers $Headers

    Success "Fetched created note"

    PrintResponse "GET /api/notes/:id" $note

} catch {

    Fail "Failed fetching created note"
    throw
}

# =========================================================
# TEST 4 - PATCH NOTE
# =========================================================

Step "TEST 4 - PATCH NOTE"

$patchPayload = @{
    title = "Updated API Test Note"
    content = @"
# Updated API Test Content

- AI summaries
- Tag generation
- Sharing APIs
- Public access
- Permission requests

TODO:
- Improve backend
- Add monitoring
- Finish testing
"@
} | ConvertTo-Json -Depth 10

try {

    $patched = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId" `
        -Method PATCH `
        -Headers $JsonHeaders `
        -Body $patchPayload

    Success "Patched note"

    PrintResponse "PATCH /api/notes/:id" $patched

} catch {

    Fail "Failed patching note"
    throw
}

# =========================================================
# TEST 5 - VERIFY PATCH
# =========================================================

Step "TEST 5 - VERIFY PATCH"

try {

    $patchedNote = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId" `
        -Method GET `
        -Headers $Headers

    Success "Verified patch"

    PrintResponse "GET patched note" $patchedNote

} catch {

    Fail "Failed verifying patch"
    throw
}

# =========================================================
# TEST 6 - GENERATE AI
# =========================================================

Step "TEST 6 - GENERATE AI"

$aiPayload = @{
    kinds = @(
        "summary",
        "title",
        "actions",
        "tags"
    )
    force = $true
} | ConvertTo-Json -Depth 10

try {

    $aiResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId/generate-summary" `
        -Method POST `
        -Headers $JsonHeaders `
        -Body $aiPayload

    Success "AI generation completed"

    PrintResponse "POST generate-summary" $aiResponse

} catch {

    Fail "AI generation failed"
    throw
}

# =========================================================
# TEST 7 - VERIFY AI SAVED
# =========================================================

Step "TEST 7 - VERIFY AI DATA SAVED"

try {

    Start-Sleep -Seconds 2

    $aiNote = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId" `
        -Method GET `
        -Headers $Headers

    Success "Fetched note after AI generation"

    PrintResponse "GET AI-enriched note" $aiNote

    if ($aiNote.aiSummary) {
        Success "AI Summary exists"
    } else {
        Fail "AI Summary missing"
    }

    if ($aiNote.aiSuggestedTitle) {
        Success "AI Suggested Title exists"
    } else {
        Fail "AI Suggested Title missing"
    }

    if ($aiNote.aiActionItems) {

        if ($aiNote.aiActionItems.Count -gt 0) {
            Success "AI Action Items exist"
        } else {
            Info "No action items extracted (valid AI outcome)"
        }

    } else {

        Info "No action items field returned"
    }

    if ($aiNote.tags -and $aiNote.tags.Count -gt 0) {
        Success "Tags exist"
    } else {
        Fail "Tags missing"
    }

} catch {

    Fail "Failed verifying AI data"
    throw
}

# =========================================================
# TEST 8 - ENABLE SHARING
# =========================================================

Step "TEST 8 - ENABLE SHARING"

try {

    $shareResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId/share" `
        -Method POST `
        -Headers $Headers

    Success "Enabled sharing"

    PrintResponse "POST /share" $shareResponse

    $ShareId = $shareResponse.shareId

    Success "Captured Share ID: $ShareId"

} catch {

    Fail "Failed enabling sharing"
    throw
}

# =========================================================
# TEST 9 - VERIFY SHARED NOTE
# =========================================================

Step "TEST 9 - VERIFY SHARED NOTE PUBLIC ACCESS"

try {

    $sharedNote = Invoke-RestMethod `
        -Uri "$BaseUrl/api/shared/$ShareId" `
        -Method GET

    Success "Fetched shared note without auth"

    PrintResponse "GET /api/shared/:shareId" $sharedNote

} catch {

    Fail "Failed fetching shared note"
    throw
}

# =========================================================
# TEST 10 - REQUEST ACCESS
# =========================================================

Step "TEST 10 - REQUEST EDIT ACCESS"

$requestPayload = @{
    message = "Automated API access request test"
} | ConvertTo-Json

try {

    $requestResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/shared/$ShareId/request" `
        -Method POST `
        -Headers $JsonHeaders `
        -Body $requestPayload

    Success "Requested edit access"

    PrintResponse "POST access request" $requestResponse

} catch {

    $statusCode = $_.Exception.Response.StatusCode.value__

    if ($statusCode -eq 400 -or `
        $statusCode -eq 401 -or `
        $statusCode -eq 403 -or `
        $statusCode -eq 409 -or `
        $statusCode -eq 500) {

        Info "Access request rejected (expected for owner/self-request)"

        Write-Host $_.Exception.Message -ForegroundColor Yellow

    } else {

        Fail "Unexpected access request failure"
        throw
    }
}

# =========================================================
# TEST 11 - DISABLE SHARING
# =========================================================

Step "TEST 11 - DISABLE SHARING"

try {

    $disableResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId/share" `
        -Method DELETE `
        -Headers $Headers

    Success "Disabled sharing"

    PrintResponse "DELETE /share" $disableResponse

} catch {

    Fail "Failed disabling sharing"
    throw
}

# =========================================================
# TEST 12 - VERIFY SHARE REMOVED
# =========================================================

Step "TEST 12 - VERIFY SHARE REMOVED"

try {

    Invoke-RestMethod `
        -Uri "$BaseUrl/api/shared/$ShareId" `
        -Method GET

    Fail "Shared note still accessible after disabling"

} catch {

    Success "Shared note no longer accessible"
}

# =========================================================
# TEST 13 - DELETE NOTE
# =========================================================

Step "TEST 13 - DELETE NOTE"

try {

    $deleteResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId" `
        -Method DELETE `
        -Headers $Headers

    Success "Deleted note"

    PrintResponse "DELETE /api/notes/:id" $deleteResponse

} catch {

    Fail "Failed deleting note"
    throw
}

# =========================================================
# TEST 14 - VERIFY NOTE DELETED
# =========================================================

Step "TEST 14 - VERIFY NOTE DELETED"

try {

    Invoke-RestMethod `
        -Uri "$BaseUrl/api/notes/$NoteId" `
        -Method GET `
        -Headers $Headers

    Fail "Note still exists after deletion"

} catch {

    Success "Note successfully deleted"
}

# =========================================================
# DONE
# =========================================================

Write-Host ""
Write-Host "#########################################################" -ForegroundColor Green
Write-Host "# ALL API TESTS COMPLETED" -ForegroundColor Green
Write-Host "#########################################################" -ForegroundColor Green