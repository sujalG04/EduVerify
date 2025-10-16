// --- BLOCKCHAIN CORE --- //

class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // Certificate data including file hash
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return CryptoJS.SHA256(
            this.index + this.previousHash + this.timestamp + JSON.stringify(this.data)
        ).toString();
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock() {
        return new Block(0, new Date().toISOString(), "Genesis Block", "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.hash = newBlock.calculateHash();
        this.chain.push(newBlock);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            if (currentBlock.hash !== currentBlock.calculateHash()) return false;
            if (currentBlock.previousHash !== previousBlock.hash) return false;
        }
        return true;
    }
}

// --- UI LOGIC --- //

document.addEventListener('DOMContentLoaded', () => {
    const certChain = new Blockchain();

    // DOM Elements
    const issueBtn = document.getElementById('issueBtn');
    const verifyChainBtn = document.getElementById('verifyChainBtn');
    const verifyCertBtn = document.getElementById('verifyCertBtn');

    /**
     * Reads a file and calculates its SHA256 hash.
     * @param {File} file - The file to hash.
     * @returns {Promise<string>} A promise that resolves with the file's hash.
     */
    function hashFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const binary = event.target.result;
                const wordArray = CryptoJS.lib.WordArray.create(binary);
                const hash = CryptoJS.SHA256(wordArray).toString();
                resolve(hash);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    // Event Listener for Issuing a Certificate
    issueBtn.addEventListener('click', async () => {
        const studentName = document.getElementById('studentName').value;
        const courseName = document.getElementById('courseName').value;
        const institutionName = document.getElementById('institutionName').value;
        const pdfFile = document.getElementById('pdfFile').files[0];

        if (!studentName || !courseName || !institutionName || !pdfFile) {
            alert('Please fill in all fields and upload a certificate PDF.');
            return;
        }

        try {
            const fileHash = await hashFile(pdfFile);
            const certificateData = {
                student: studentName,
                course: courseName,
                institution: institutionName,
                issueDate: new Date().toLocaleDateString(),
                fileHash: fileHash // Store hash of the PDF
            };

            const newBlock = new Block(certChain.getLatestBlock().index + 1, new Date().toISOString(), certificateData);
            certChain.addBlock(newBlock);
            
            console.log("Block added:", newBlock);
            displayBlockchain();
            
            // Clear inputs
            document.getElementById('studentName').value = '';
            document.getElementById('courseName').value = '';
            document.getElementById('institutionName').value = '';
            document.getElementById('pdfFile').value = '';

        } catch (error) {
            console.error("Error hashing file:", error);
            alert("Could not process the file. Please try again.");
        }
    });

    // Event Listener for Verifying the Entire Chain
    verifyChainBtn.addEventListener('click', () => {
        const chainStatusEl = document.getElementById('chainStatus');
        const isValid = certChain.isChainValid();
        chainStatusEl.textContent = `Status: The entire chain is ${isValid ? 'VALID ✅' : 'INVALID ❌'}.`;
        chainStatusEl.style.color = isValid ? 'green' : 'red';
    });
    
    // Event Listener for Verifying a Single Certificate
    verifyCertBtn.addEventListener('click', async () => {
        const blockNumber = parseInt(document.getElementById('blockNumber').value);
        const pdfToVerify = document.getElementById('pdfToVerify').files[0];
        const singleCertStatusEl = document.getElementById('singleCertStatus');

        if (isNaN(blockNumber) || !pdfToVerify) {
            alert("Please specify a block number and upload the PDF to verify.");
            return;
        }
        if (blockNumber <= 0 || blockNumber >= certChain.chain.length) {
            alert("Invalid block number. Please enter a valid index from the chain.");
            return;
        }

        try {
            const uploadedFileHash = await hashFile(pdfToVerify);
            const blockToVerify = certChain.chain[blockNumber];
            const storedHash = blockToVerify.data.fileHash;

            if (uploadedFileHash === storedHash) {
                singleCertStatusEl.textContent = 'Status: Certificate is AUTHENTIC. ✅ The hashes match.';
                singleCertStatusEl.style.color = 'green';
            } else {
                singleCertStatusEl.textContent = 'Status: TAMPERED! ❌ The certificate does not match the blockchain record.';
                singleCertStatusEl.style.color = 'red';
            }
        } catch (error) {
            console.error("Error during single certificate verification:", error);
            alert("Could not verify the certificate.");
        }
    });


    // Function to render the blockchain on the page
    function displayBlockchain() {
        const blockchainContainer = document.getElementById('blockchain');
        blockchainContainer.innerHTML = '';
        certChain.chain.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'block';
            const dataString = JSON.stringify(block.data, null, 2);

            blockElement.innerHTML = `
                <p><strong>Block #${block.index}</strong></p>
                <div class="block-data"><pre>${dataString}</pre></div>
                <p><small>Timestamp: ${block.timestamp}</small></p>
                <p>
                    <small>Previous Hash:</small><br>
                    <span class="block-hash">${block.previousHash}</span>
                </p>
                <p>
                    <small>Hash:</small><br>
                    <span class="block-hash">${block.hash}</span>
                </p>
            `;
            blockchainContainer.appendChild(blockElement);
        });
    }

    // Initial display
    displayBlockchain();
});