import GameState from "../../../../../../GameState";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import Game from "../../../../../game-data-structure/Game";
import ActionGameState from "../../../../ActionGameState";
import House from "../../../../../game-data-structure/House";
import CombatGameState from "../../CombatGameState";
import CancelHouseCardAbilitiesGameState from "../CancelHouseCardAbilitiesGameState";
import SelectHouseCardGameState, {SerializedSelectHouseCardGameState} from "../../../../../select-house-card-game-state/SelectHouseCardGameState";
import HouseCard, {HouseCardState} from "../../../../../game-data-structure/house-card/HouseCard";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../../../simple-choice-game-state/SimpleChoiceGameState";
import IngameGameState from "../../../../../IngameGameState";
import ImmediatelyHouseCardAbilitiesResolutionGameState from "../../immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";

export default class TyrionLannisterAbilityGameState extends GameState<
    CancelHouseCardAbilitiesGameState["childGameState"] | ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"],
        SimpleChoiceGameState | SelectHouseCardGameState<TyrionLannisterAbilityGameState>
    > {
    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.combatGameState.ingameGameState;
    }

    get actionGameState(): ActionGameState {
        return this.combatGameState.actionGameState;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Activate", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        const enemy = this.combatGameState.getEnemy(house);

        this.ingame.log({
            type: "tyrion-lannister-choice-made",
            house: house.id,
            affectedHouse: enemy.id,
            chooseToReplace: choice == 0
        });

        if (choice == 0) {
            const choosableHouseCards = this.getChoosableHouseCards(house);

            // The enemy may not have any available house cards
            if (choosableHouseCards.length == 0) {
                this.onSelectHouseCardFinish(enemy, null, false);
                return;
            }

            this.combatGameState.houseCombatDatas.get(enemy).houseCard = null;
            this.entireGame.broadcastToClients({
                type: "change-combat-house-card",
                houseCardIds: [[enemy.id, null]]
            });

            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(
                enemy,
                choosableHouseCards
            );
        } else {
            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    getChoosableHouseCards(house: House): HouseCard[] {
        const enemy = this.combatGameState.getEnemy(house);
        const enemyHouseCard = this.combatGameState.houseCombatDatas.get(enemy).houseCard;

        return enemy.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE).filter(hc => hc != enemyHouseCard);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedTyrionLannisterAbilityGameState {
        return {
            type: "tyrion-lannister-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    onSelectHouseCardFinish(enemy: House, houseCard: HouseCard | null, resolvedAutomatically: boolean): void {
        const house = this.combatGameState.getEnemy(enemy);

        this.changeHouseCardEnemy(enemy, houseCard);

        this.ingame.log({
            type: "tyrion-lannister-house-card-replaced",
            house: house.id,
            affectedHouse: enemy.id,
            newHouseCard: houseCard ? houseCard.id : null
        }, resolvedAutomatically);

        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    changeHouseCardEnemy(enemy: House, houseCard: HouseCard | null): void {
        this.combatGameState.houseCombatDatas.get(enemy).houseCard = houseCard;

        this.entireGame.broadcastToClients({
            type: "change-combat-house-card",
            houseCardIds: [[enemy.id, houseCard ? houseCard.id : null]]
        });
    }

    static deserializeFromServer(houseCardResolution: CancelHouseCardAbilitiesGameState["childGameState"] | ImmediatelyHouseCardAbilitiesResolutionGameState["childGameState"], data: SerializedTyrionLannisterAbilityGameState): TyrionLannisterAbilityGameState {
        const tyrionLannisterAbilityGameState = new TyrionLannisterAbilityGameState(houseCardResolution);

        tyrionLannisterAbilityGameState.childGameState = tyrionLannisterAbilityGameState.deserializeChildGameState(data.childGameState);

        return tyrionLannisterAbilityGameState;
    }

    deserializeChildGameState(data: SerializedTyrionLannisterAbilityGameState["childGameState"]): TyrionLannisterAbilityGameState["childGameState"] {
        switch (data.type) {
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedTyrionLannisterAbilityGameState {
    type: "tyrion-lannister-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
