import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import GameClient from "./GameClient";
import { GameSettings } from "../common/EntireGame";
import EntireGame from "../common/EntireGame";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { allGameSetups, getGameSetupContainer } from "../common/ingame-game-state/game-data-structure/createGame";

interface GameSettingsComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
}

@observer
export default class GameSettingsComponent extends Component<GameSettingsComponentProps> {
    get entireGame(): EntireGame {
        return this.props.entireGame;
    }

    get gameSettings(): GameSettings {
        return this.entireGame.gameSettings;
    }

    get canChangeGameSettings(): boolean {
        return this.props.gameClient.isOwner();
    }

    render(): ReactNode {
        return (
            <>
                {this.props.entireGame.childGameState instanceof LobbyGameState && (
                    <>
                        <Row>
                            <Col xs="auto">
                                <select id="setups" name="setups"
                                    value={this.gameSettings.setupId}
                                    disabled={!this.canChangeGameSettings}
                                    onChange={e => this.onSetupChange(e.target.value)}>
                                    {this.createSetupItems()}
                                </select>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <select id="player-count" name="playerCount"
                                    value={this.gameSettings.playerCount}
                                    disabled={!this.canChangeGameSettings}
                                    onChange={e => this.onPlayerCountChange(e.target.value)}>
                                    {this.createPlayerCountItems()}
                                </select>
                            </Col>
                            <Col xs="auto">
                                <>Players</>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <FormCheck
                                    id="adwd-house-cards"
                                    type="checkbox"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="adwd-house-cards-tooltip">
                                                The house cards will come from the Dance with Dragons expansion.
                                            </Tooltip>}>
                                            <label htmlFor="adwd-house-cards">Use <i>A Dance with Dragons</i> house cards (BETA)</label>
                                        </OverlayTrigger>}
                                    disabled={!this.canChangeGameSettings || this.props.entireGame.gameSettings.setupId == "a-dance-with-dragons"}
                                    checked={this.gameSettings.adwdHouseCards}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.adwdHouseCards = !this.gameSettings.adwdHouseCards)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <FormCheck
                                    id="random-houses-setting"
                                    type="checkbox"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="random-houses-tooltip">
                                                Houses will be randomized before the game starts when this option is selected.
                                            </Tooltip>}>
                                            <label htmlFor="random-houses-setting">Randomize houses</label>
                                        </OverlayTrigger>}
                                    disabled={!this.canChangeGameSettings}
                                    checked={this.gameSettings.randomHouses}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.randomHouses = !this.gameSettings.randomHouses)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <FormCheck
                                    id="vassals-setting"
                                    type="checkbox"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="vassals-tooltip">
                                                Unassigned houses will be vassals from Mother of Dragons expansion and players start with 7 Power tokens instead of 5.
                                            </Tooltip>}>
                                            <label htmlFor="vassals-setting">MoD Vassals (BETA)</label>
                                        </OverlayTrigger>}
                                    disabled={!this.canChangeGameSettings}
                                    checked={this.gameSettings.vassals}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.vassals = !this.gameSettings.vassals)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <FormCheck
                                    id="sea-orders-setting"
                                    type="checkbox"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="sea-orders-tooltip">
                                                Sea order tokens from Mother of Dragons expansion will be available.
                                            </Tooltip>}>
                                            <label htmlFor="sea-orders-setting">MoD Sea Order Tokens (BETA)</label>
                                        </OverlayTrigger>}
                                    disabled={!this.canChangeGameSettings}
                                    checked={this.gameSettings.seaOrderTokens}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.seaOrderTokens = !this.gameSettings.seaOrderTokens)}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs="auto">
                                <FormCheck
                                    id="westeros-phase-variant-setting"
                                    type="checkbox"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="westeros-phase-variant-tooltip">
                                                Players may look at the next 3 Westeros cards from each deck at any time.
                                            </Tooltip>}>
                                            <label htmlFor="westeros-phase-variant-setting">CoK Westeros Phase Variant</label>
                                        </OverlayTrigger>}
                                    disabled={!this.canChangeGameSettings}
                                    checked={this.gameSettings.cokWesterosPhase}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.cokWesterosPhase = !this.gameSettings.cokWesterosPhase)}
                                />
                            </Col>
                        </Row>
                    </>
                )}
                <Row>
                    <Col xs="auto">
                        <FormCheck
                            id="pbem-setting"
                            type="checkbox"
                            label={
                                <OverlayTrigger overlay={
                                    <Tooltip id="pbem-tooltip">
                                        <b>P</b>lay <b>B</b>y <b>E</b>-<b>M</b>ail<br />
                                        Players receive an e-mail when it is their turn.
                                        Those games are typically played over days or weeks.
                                    </Tooltip>}>
                                    <label htmlFor="pbem-setting">PBEM</label>
                                </OverlayTrigger>}
                            disabled={!this.canChangeGameSettings}
                            checked={this.gameSettings.pbem}
                            onChange={() => this.changeGameSettings(() => this.gameSettings.pbem = !this.gameSettings.pbem)}
                        />
                    </Col>
                </Row>
            </>
        );
    }

    createSetupItems(): ReactNode {
        const items: JSX.Element[] = [];

        allGameSetups.forEach((setupData, setupId) => {
            items.push(<option key={setupId} value={setupId}>{setupData.name}</option>);
        });

        return items;
    }

    createPlayerCountItems(): ReactNode {
        const items: JSX.Element[] = [];

        const playerSetups = getGameSetupContainer(this.gameSettings.setupId).playerSetups;

        playerSetups.forEach(gameSetup => {
            items.push(<option key={gameSetup.playerCount} value={gameSetup.playerCount}>{gameSetup.playerCount}</option>);
        });

        return items;
    }

    onSetupChange(newVal: string): void {
        this.gameSettings.setupId = newVal;

        // On setup change set player count to it's default value which should be the highest value (last element)
        const container = getGameSetupContainer(newVal);
        const playerCounts = container.playerSetups.map(playerSetup => playerSetup.playerCount);
        const defaultPlayerCount = playerCounts[playerCounts.length - 1];
        this.gameSettings.playerCount = defaultPlayerCount;

        this.changeGameSettings();
    }

    onPlayerCountChange(newVal: string): void {
        this.gameSettings.playerCount = parseInt(newVal);

        this.changeGameSettings();
    }

    /**
     * Helper function to modify gameSettings and update the game settings.
     * @param action Function that modifies gameSettings
     */
    changeGameSettings(action: () => void = () => {}): void {
        action();

        this.props.entireGame.updateGameSettings(this.gameSettings);
    }
}