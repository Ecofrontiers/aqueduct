// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeployBase.s.sol";

/// @title DeployTestnet
/// @notice Deploy to Base Sepolia testnet
contract DeployTestnet is DeployBase {
    // Base Sepolia addresses
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant CHAINLINK_REGISTRY_SEPOLIA = address(0); // No automation on Sepolia

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        admin = vm.addr(deployerPrivateKey);
        usdc = BASE_SEPOLIA_USDC;
        chainlinkRegistry = CHAINLINK_REGISTRY_SEPOLIA;

        console.log("Deploying to Base Sepolia...");
        console.log("Admin:", admin);

        vm.startBroadcast(deployerPrivateKey);

        _deployCore();
        _deployFinancial();
        _deployA2A();
        _deployGovernance();
        _configureRoles();
        _configureBioregions();

        vm.stopBroadcast();

        _writeDeploymentFile("base-sepolia");

        console.log("\n=== Deployment Complete ===");
        console.log("Total contracts deployed: 18");
    }
}

/// @title DeployLocal
/// @notice Deploy to local Anvil instance
contract DeployLocal is DeployBase {
    function run() external {
        // Anvil default private key
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        admin = vm.addr(deployerPrivateKey);

        // Deploy mock USDC for local testing
        vm.startBroadcast(deployerPrivateKey);

        // Simple mock USDC
        MockUSDC mockUsdc = new MockUSDC();
        usdc = address(mockUsdc);
        chainlinkRegistry = address(0);

        console.log("Deploying to Local Anvil...");
        console.log("Admin:", admin);
        console.log("Mock USDC:", usdc);

        _deployCore();
        _deployFinancial();
        _deployA2A();
        _deployGovernance();
        _configureRoles();
        _configureBioregions();

        // Mint some test USDC to admin
        mockUsdc.mint(admin, 10_000_000e6); // 10M USDC

        vm.stopBroadcast();

        _writeDeploymentFile("localhost");

        console.log("\n=== Local Deployment Complete ===");
        console.log("Total contracts deployed: 18 + MockUSDC");
    }
}

/// @title MockUSDC
/// @notice Simple mock USDC for testing
contract MockUSDC {
    string public name = "USD Coin";
    string public symbol = "USDC";
    uint8 public decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
