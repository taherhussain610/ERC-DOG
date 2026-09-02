// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AtlasXAssetRegistry {
    struct Asset {
        string symbol;
        string name;
        string metadataUri;
        address registrar;
        uint64 registeredAt;
    }

    Asset[] private assets;

    event AssetRegistered(
        uint256 indexed assetId,
        string symbol,
        string name,
        string metadataUri,
        address indexed registrar
    );

    function registerAsset(
        string calldata symbol,
        string calldata name,
        string calldata metadataUri
    ) external returns (uint256 assetId) {
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 12, "Symbol must be 1-12 bytes");
        require(bytes(name).length > 0 && bytes(name).length <= 80, "Name must be 1-80 bytes");
        require(bytes(metadataUri).length <= 240, "Metadata URI is too long");

        assetId = assets.length;
        assets.push(
            Asset({
                symbol: symbol,
                name: name,
                metadataUri: metadataUri,
                registrar: msg.sender,
                registeredAt: uint64(block.timestamp)
            })
        );

        emit AssetRegistered(assetId, symbol, name, metadataUri, msg.sender);
    }

    function totalAssets() external view returns (uint256) {
        return assets.length;
    }

    function assetAt(uint256 assetId) external view returns (Asset memory) {
        require(assetId < assets.length, "Asset does not exist");
        return assets[assetId];
    }
}