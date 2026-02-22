# ModelShield - AI Model Integrity Registry on Blockchain

<div align="center">

**A decentralized application (dApp) that permanently registers AI models on the Ethereum blockchain, detects plagiarism using cryptographic fingerprinting, and enables on-chain NFT licensing.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?logo=ethereum)](https://sepolia.etherscan.io)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)](https://soliditylang.org)
[![Python](https://img.shields.io/badge/Python-Flask-3776AB?logo=python)](https://flask.palletsprojects.com)

</div>

---

## Table of Contents

1. [What is ModelShield?](#what-is-modelshield)
2. [The Problem It Solves](#the-problem-it-solves)
3. [System Architecture](#system-architecture)
4. [How It Works - Step by Step](#how-it-works---step-by-step)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Smart Contract Deep Dive](#smart-contract-deep-dive)
8. [Python Backend Deep Dive](#python-backend-deep-dive)
9. [Frontend Pages](#frontend-pages)
10. [UI Components](#ui-components)
11. [Getting Started](#getting-started)
12. [Environment Variables](#environment-variables)
13. [Wallet & Network Setup](#wallet--network-setup)
14. [API Reference](#api-reference)
15. [Known Limitations](#known-limitations)


---

## What is ModelShield?

ModelShield is a **decentralized AI model registry** built on the Ethereum blockchain. It lets AI developers:

- **Prove ownership** of a trained model at a specific point in time
- **Detect copies** - both exact binary copies and architectural/behavioral clones
- **Issue licenses** - sell usage rights as an NFT recorded permanently on-chain
- **Stay tamper-proof** - blockchain records are immutable and public, no central authority needed

> Think of it as a **"copyright office for AI models"** - automated, instant, and decentralized.

---

## The Problem It Solves

AI models take months and significant compute resources to train. Currently:

| Problem | Reality |
|---------|---------|
| Anyone can copy your `.pkl` or `.h5` model file | No cryptographic proof of original authorship |
| Renaming/slightly modifying a file defeats simple hash checks | Need deeper fingerprinting |
| Licensing is informal (README files, emails) | Not verifiable or enforceable |
| No public registry exists | No way to prove "who made this model first" |

**ModelShield solves all of these** using three cryptographic hashes per model, stored permanently on the Ethereum blockchain.

---

## System Architecture

```
+--------------------------------------------------------------+
|                        USER BROWSER                          |
|                                                              |
|   +------------------+        +--------------------------+  |
|   |  Next.js Frontend|        |     MetaMask Wallet      |  |
|   |  (React / TS)    |<------>|  (Signs Transactions)    |  |
|   +--------+---------+        +------------+-------------+  |
|            |                               |                 |
+------------+-------------------------------+-----------------+
             | HTTP POST                     | ethers.js v6
             | multipart/form-data           | JSON-RPC calls
             v                               v
+------------------------+   +---------------------------------+
|  Python Flask Server   |   |   Ethereum Sepolia Testnet      |
|  (Fingerprint Engine)  |   |                                 |
|                        |   |  +--------------------------+  |
|  - SHA-256 file hash   |   |  |  ModelRegistryEconomy    |  |
|  - Architecture hash   |   |  |  Smart Contract (ERC-721) |  |
|  - Behavioral hash     |   |  |                          |  |
|                        |   |  |  registerModel()         |  |
|  Supports:             |   |  |  checkPlagiarism()       |  |
|  - .pkl  (Scikit-Learn)|   |  |  buyLicense()            |  |
|  - .h5 / .keras  (TF)  |   |  |  hashToTokenId()         |  |
+------------------------+   |  +--------------------------+  |
                             +---------------------------------+
```

---

## How It Works - Step by Step

### Registering a Model

```
Step 1: User uploads .pkl / .h5 / .keras file
           |
           v
Step 2: Python backend generates 3 hashes:
        +------------------------------------------------------+
        | fileHash       = SHA-256(raw file bytes)             |
        |                  --> Detects EXACT copies            |
        |                                                      |
        | structuralHash = SHA-256(model layer architecture)   |
        |                  --> Detects ARCHITECTURE clones     |
        |                                                      |
        | behavioralHash = SHA-256(model output on test input) |
        |                  --> Detects BEHAVIORAL clones       |
        +------------------------------------------------------+
           |
           v
Step 3: Frontend checks blockchain -- already registered? --> Block early
           |
           v
Step 4: User approves MetaMask transaction
           |
           v
Step 5: Smart contract mints ERC-721 NFT to user's wallet
        Stores: fileHash, structuralHash, behavioralHash,
                block.timestamp, msg.sender (owner), licenseFee
           |
           v
Step 6: Model is permanently on-chain. Token ID returned.
        Verifiable on Etherscan forever.
```

### Verifying / Plagiarism Detection

```
Step 1: Upload the model file to check
           |
           v
Step 2: Python backend generates the same 3 hashes
           |
           v
Step 3: L1 - Exact Check (fast, O(1))
        hashToTokenId(fileHash) --> tokenId > 0?
        YES --> LEVEL 1: EXACT COPY  [red]
           | NO
           v
Step 4: L2 - Deep Scan (loops all registered models)
        checkPlagiarism(structuralHash, behavioralHash)
        Match found? --> LEVEL 2: DEEP CLONE  [amber]
           | NO
           v
Step 5: CLEAN - Original, not found in registry  [green]
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | Next.js | 16.1.6 | React App Router SSR framework |
| Language | TypeScript | 5 | Type-safe frontend code |
| UI Library | React | 19 | Component-based rendering |
| Styling | Tailwind CSS | 4 | Utility-first CSS |
| Animations | Framer Motion | 12 | Page & component animations |
| Icons | Lucide React | 0.575 | Icon library |
| Blockchain SDK | ethers.js | 6 | Ethereum wallet & contract interaction |
| HTTP Client | Axios | 1.13 | Backend API calls with timeout |
| Backend | Python + Flask | 3.x | AI model fingerprinting server |
| ML Libraries | TensorFlow + Scikit-Learn + NumPy | latest | Model loading, inference, hashing |
| Smart Contract | Solidity | 0.8.20 | On-chain registry & economy logic |
| NFT Standard | ERC-721 (OpenZeppelin) | - | Each model = unique NFT |
| Network | Ethereum Sepolia Testnet | - | Test blockchain environment |
| Wallet | MetaMask | - | Transaction signing & wallet management |

---

## Project Structure

```
ModelShield/
|
+-- app/
|   +-- layout.tsx                  # Root layout - fonts, background, cursor glow
|   +-- globals.css                 # CSS variables, animations, utility classes
|   +-- page.tsx                    # / - Register page
|   +-- verify/
|   |   +-- page.tsx                # /verify - Plagiarism check + buy license
|   +-- components/
|       +-- Navbar.tsx              # Top nav - wallet connect/disconnect dropdown
|       +-- AnimatedBackground.tsx  # Fullscreen animated background
|       +-- CursorGlow.tsx          # Cursor radial glow effect
|       +-- ScrambleText.tsx        # Hash scramble-reveal animation
|       +-- TiltCard.tsx            # 3D tilt + spotlight on hover
|       +-- SuccessConfetti.tsx     # Particle burst on registration success
|
+-- public/                         # Static assets
+-- next.config.ts
+-- tsconfig.json
+-- package.json
+-- README.md

-- Local only (not in repo) --------
+-- backend/app.py                  # Python Flask server
+-- contract/ModelRegistryEconomy.sol
+-- test_models/                    # Sample .pkl / .h5 files
```

---

## Smart Contract Deep Dive

**Contract:** `ModelRegistryEconomy`  
**Network:** Ethereum Sepolia Testnet  
**Address:** `0xB33696938e5b161b337d58C03b98f7C28b065c0f`  
**Standard:** ERC-721 - every registered model is a unique, tradeable NFT  
**Token:** `AI Model DRM (AIMDL)`  

View on Etherscan: https://sepolia.etherscan.io/address/0xB33696938e5b161b337d58C03b98f7C28b065c0f

### Data Structure

```solidity
struct ModelData {
    string  fileHash;        // SHA-256 of raw model file bytes
    string  structuralHash;  // Architecture fingerprint
    string  behavioralHash;  // Output/behavior fingerprint
    uint256 timestamp;       // Unix time of registration (block.timestamp)
    address owner;           // Wallet address of original registrant
    uint256 licenseFee;      // Price in Wei to buy a usage license
}
```

### Storage

```solidity
mapping(uint256 => ModelData)                public registeredModels; // tokenId -> data
mapping(string  => uint256)                  public hashToTokenId;    // fileHash -> tokenId
mapping(uint256 => mapping(address => bool)) public hasLicense;       // tokenId -> user -> licensed?
string[] public allFileHashes;                                         // for L2 plagiarism loop
uint256  public nextTokenId = 1;
```

### Key Functions

#### registerModel - Mint a new model NFT

```solidity
function registerModel(
    string memory _fileHash,
    string memory _structHash,
    string memory _behavHash,
    uint256 _fee
) public {
    require(hashToTokenId[_fileHash] == 0, "Model already exists");
    uint256 tokenId = nextTokenId++;
    _mint(msg.sender, tokenId);
    registeredModels[tokenId] = ModelData(_fileHash, _structHash, _behavHash,
                                          block.timestamp, msg.sender, _fee);
    hashToTokenId[_fileHash] = tokenId;
    allFileHashes.push(_fileHash);
}
```

#### checkPlagiarism - L2 deep scan across all models

```solidity
function checkPlagiarism(string memory _s, string memory _b)
    public view returns (bool found, string memory matchedFileHash)
{
    bytes32 targetStruct = keccak256(abi.encodePacked(_s));
    bytes32 targetBehav  = keccak256(abi.encodePacked(_b));
    for (uint i = 0; i < allFileHashes.length; i++) {
        uint256 tokenId = hashToTokenId[allFileHashes[i]];
        ModelData memory m = registeredModels[tokenId];
        if (keccak256(abi.encodePacked(m.structuralHash)) == targetStruct ||
            keccak256(abi.encodePacked(m.behavioralHash)) == targetBehav) {
            return (true, allFileHashes[i]);
        }
    }
    return (false, "");
}
```

#### buyLicense - Pay ETH, get permanent on-chain license

```solidity
function buyLicense(uint256 _tokenId) public payable {
    ModelData memory m = registeredModels[_tokenId];
    require(m.owner != address(0), "Model does not exist");
    require(msg.value >= m.licenseFee, "Insufficient ETH sent");
    hasLicense[_tokenId][msg.sender] = true;                         // grant license
    (bool success, ) = payable(m.owner).call{value: msg.value}("");  // pay owner
    require(success, "ETH transfer failed");
}
```

---

## Python Backend Deep Dive

A **Flask REST API** with one job: receive a model file, return 3 cryptographic hashes.

### Endpoint: `POST /generate-fingerprints`

```
Input:  multipart/form-data  { file: <model_file> }

Output: {
  "fileHash":       "0x<sha256_raw_bytes>",
  "structuralHash": "0x<architecture_fingerprint>",
  "behavioralHash": "0x<behavior_fingerprint>"
}
```

### For TensorFlow / Keras (`.h5`, `.keras`)

```python
# File Hash - raw bytes
file_hash = hashlib.sha256(open(filepath, 'rb').read()).hexdigest()

# Structural Hash - full JSON model architecture (all layers, units, activations)
structural_hash = hashlib.sha256(model.to_json().encode()).hexdigest()

# Behavioral Hash - fixed random input (seed=42) -> predictions -> hash
input_shape[0] = 1
test_input = np.random.rand(*input_shape).astype(np.float32)
predictions = model.predict(test_input, verbose=0)
behavioral_hash = hashlib.sha256(str(np.round(predictions, 4)).encode()).hexdigest()
```

### For Scikit-Learn (`.pkl`)

```python
# File Hash - raw bytes
file_hash = hashlib.sha256(open(filepath, 'rb').read()).hexdigest()

# Structural Hash - model type + names/shapes of all learned attributes (coef_, etc.)
model_type = type(model).__name__
learned_attrs = {a: str(getattr(model, a).shape) for a in dir(model) if a.endswith('_')}
structural_hash = hashlib.sha256(f"{model_type}_{sorted(learned_attrs.items())}".encode()).hexdigest()

# Behavioral Hash - 5 fixed test samples (seed=42) -> predictions -> hash
test_inputs = np.random.rand(5, n_features)
predictions = model.predict_proba(test_inputs)  # or predict()
behavioral_hash = hashlib.sha256(str(np.round(predictions, 4)).encode()).hexdigest()
```

### Why Three Hashes?

| Hash | Catches | Missed By |
|------|---------|-----------|
| `fileHash` | Byte-for-byte copy | Changing even 1 byte |
| `structuralHash` | Same architecture (layers, weight shapes) | Retraining from scratch |
| `behavioralHash` | Same learned behavior / predictions | Completely different training data |

Combined, they make it extremely hard to plagiarize undetected.

---

## Frontend Pages

### `/` - Register

Steps user through a 4-phase animated flow:

| Phase | Action |
|-------|--------|
| 1 - Analyze Model | File sent to Python backend, 3 hashes returned |
| 2 - Scan Blockchain | `hashToTokenId` + `checkPlagiarism` called to block duplicates |
| 3 - MetaMask | User approves `registerModel(...)` transaction |
| 4 - Confirmation | Tx mined, NFT created, Etherscan link displayed |

Features: drag & drop upload, hash panel with scramble-reveal animation, confetti burst on success.

### `/verify` - Plagiarism Check

| Result | Meaning |
|--------|---------|
| [RED] LEVEL 1 - EXACT | fileHash matched - byte-for-byte copy |
| [AMBER] LEVEL 2 - DEEP | structuralHash or behavioralHash matched - architecture clone |
| [GREEN] CLEAN | Not found anywhere in the registry |

Shows: original owner address, registration date, all 3 hash comparisons.

**Buy License:** Pay 0.01 ETH --> `buyLicense(tokenId)` --> permanent on-chain usage right.

---

## UI Components

| Component | Purpose |
|-----------|---------|
| **Navbar** | Glassmorphism sticky nav. MetaMask connect button with live state. Connected: shows wallet address + dropdown with copy & disconnect. Disconnect persists across refresh via `sessionStorage`. |
| **AnimatedBackground** | Fullscreen fixed layer: gradient base + 3 animated radial orbs + 18 floating micro-particles. Client-only render prevents SSR hydration mismatch. |
| **CursorGlow** | 100px radial cyan glow that tracks cursor in real time (no CSS transition lag). Very subtle opacity. |
| **ScrambleText** | Animates crypto hash strings through random ASCII characters on mount - gives a "decryption reveal" effect. |
| **TiltCard** | 2 degrees max 3D tilt with spring physics (stiffness 120) + per-card spotlight following cursor. Non-distracting. |
| **SuccessConfetti** | 28 colored particles burst outward on successful model registration. |

---

## Getting Started

### Prerequisites

- Node.js >= 18 --> [nodejs.org](https://nodejs.org)
- MetaMask extension --> [metamask.io](https://metamask.io)
- Sepolia test ETH --> [sepoliafaucet.com](https://sepoliafaucet.com)


### Install & Run

```bash
git clone https://github.com/vansh3175/ModelSheild.git
cd ModelSheild
npm install
npm run dev          # --> http://localhost:3000

# Production
npm run build
npm start
```

### Backend (Vansh's machine)

```bash
cd backend/
pip install flask flask-cors numpy tensorflow scikit-learn
python app.py        # --> http://localhost:5000
```

Expose via VS Code Dev Tunnels / ngrok and update `axios.post(...)` URL in:
- `app/page.tsx` (~line 124)
- `app/verify/page.tsx` (~line 343)

---

## Environment Variables

`.env.local` (optional - hardcoded fallbacks exist):

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xB33696938e5b161b337d58C03b98f7C28b065c0f
```

---

## Wallet & Network Setup

| Setting | Value |
|---------|-------|
| Network | Ethereum Sepolia Testnet |
| Chain ID | `11155111` / `0xaa36a7` |
| RPC | `https://rpc.sepolia.org` |
| Explorer | [sepolia.etherscan.io](https://sepolia.etherscan.io) |

ModelShield **automatically** switches MetaMask to Sepolia and adds it if not present.

---

## API Reference

### POST `/generate-fingerprints`

| Field | Type | Description |
|-------|------|-------------|
| `file` | `multipart/form-data` | `.pkl`, `.h5`, or `.keras` model file |

**Success `200`:**
```json
{
  "fileHash":       "0x...",
  "structuralHash": "0x...",
  "behavioralHash": "0x..."
}
```

### Contract Functions (read - free, no gas)

| Function | Input | Output |
|----------|-------|--------|
| `hashToTokenId(fileHash)` | `string` | `uint256` (0 = not registered) |
| `registeredModels(tokenId)` | `uint256` | Full `ModelData` struct |
| `checkPlagiarism(s, b)` | `string, string` | `(bool found, string fileHash)` |
| `hasLicense(tokenId, address)` | `uint256, address` | `bool` |

### Contract Functions (write - requires MetaMask + gas)

| Function | Input | ETH Required |
|----------|-------|-----|
| `registerModel(fh, sh, bh, fee)` | 3 hashes + fee amount | Gas only |
| `buyLicense(tokenId)` | `uint256` | >= licenseFee (0.01 ETH) |

---

## Known Limitations

- Backend URL is hardcoded - update both page files when Vansh's tunnel changes
- Sepolia testnet - ETH has no real value
- `checkPlagiarism` is O(n) on-chain loop - not scalable for thousands of models without off-chain indexing
- MetaMask required for Register/Buy License; Verify works without wallet (public RPC fallback)
- Files are not stored - only hashes go on-chain; original owner should keep the file as ground truth


<div align="center">

**ModelShield - Protecting AI Intellectual Property on the Blockchain**

[View Contract on Etherscan](https://sepolia.etherscan.io/address/0xB33696938e5b161b337d58C03b98f7C28b065c0f) | [GitHub](https://github.com/vansh3175/ModelSheild)

</div>
