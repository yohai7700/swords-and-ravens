import {Component, ReactNode} from "react";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import {GameLogData} from "../common/ingame-game-state/game-data-structure/GameLog";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import House from "../common/ingame-game-state/game-data-structure/House";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import World from "../common/ingame-game-state/game-data-structure/World";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import {westerosCardTypes} from "../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";
import {observer} from "mobx-react";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";
import WildlingCard from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCard";
import WesterosCardComponent from "./game-state-panel/utils/WesterosCardComponent";
import _ from "lodash";
import joinReactNodes from "./utils/joinReactNodes";
import orders from "../common/ingame-game-state/game-data-structure/orders";
import CombatInfoComponent from "./CombatInfoComponent";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

interface GameLogListComponentProps {
    ingameGameState: IngameGameState;
}

@observer
export default class GameLogListComponent extends Component<GameLogListComponentProps> {
    get game(): Game {
        return this.props.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    render(): ReactNode {
        return this.props.ingameGameState.gameLogManager.logs.map((l, i) => (
            <Row key={i}>
                <Col xs="auto" className="text-muted">
                    <OverlayTrigger
                        placement="auto"
                        overlay={<Tooltip id={"log-date-" + l.time.getUTCMilliseconds()}>{l.time.toLocaleString()}</Tooltip>}
                        popperConfig={{ modifiers: { preventOverflow: { boundariesElement: "viewport" } } }}
                    >
                        <small>
                            {l.time.getHours().toString().padStart(2, "0")}
                            :{l.time.getMinutes().toString().padStart(2, "0")}
                        </small>
                    </OverlayTrigger>
                </Col>
                <Col>
                    <div className="game-log-content">
                        {this.renderGameLogData(l.data)}
                    </div>
                </Col>
            </Row>
        ));
    }

    renderGameLogData(data: GameLogData): ReactNode {
        switch (data.type) {
            case "turn-begin":
                return <Row className="justify-content-center">
                    <Col xs={true}><hr/></Col>
                    <Col xs="auto">
                        <h4>Turn <b>{data.turn}</b></h4>
                    </Col>
                    <Col xs={true}><hr/></Col>
                </Row>;

            case "support-declared":
                const supporter = this.game.houses.get(data.supporter);
                const supported = data.supported ? this.game.houses.get(data.supported) : null;
                if (supported) {
                    return <><b>{supporter.name}</b> supported <b>{supported.name}</b>.</>;
                } else {
                    return <><b>{supporter.name}</b> supported no-one.</>;
                }

            case "support-refused": {
                const house = this.game.houses.get(data.house);
                return <>House <b>{house.name}</b> chose to refuse all the support they received.</>;
            }

            case "attack":
                const attacker = this.game.houses.get(data.attacker);
                // A "null" for "attacked" means it was an attack against a neutral force
                const attacked = data.attacked ? this.game.houses.get(data.attacked) : null;
                const attackingRegion = this.game.world.regions.get(data.attackingRegion);
                const attackedRegion = this.game.world.regions.get(data.attackedRegion);
                const army = data.units.map(utid => unitTypes.get(utid));

                return (
                    <>
                        <b>{attacker.name}</b> attacked <b>{attacked ? attacked.name : "a neutral force"}</b> from <b>{attackingRegion.name}</b> to <b>
                        {attackedRegion.name}</b> with <>{joinReactNodes(army.map((ut, i) => <b key={i}>{ut.name}</b>), ', ')}</>.
                    </>
                );

            case "march-resolved":
                let house = this.game.houses.get(data.house);
                const startingRegion = this.world.regions.get(data.startingRegion);
                const moves: [Region, UnitType[]][] = data.moves.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return (
                    <>
                        <b>{house.name}</b> marched from <b>{startingRegion.name}</b>{
                            data.leftPowerToken != null && <> and left {data.leftPowerToken ? "a" : "no"} Power Token</>}{moves.length > 0 ? ":" : "."}
                        {moves.length > 0 &&
                        <ul>
                            {moves.map(([region, unitTypes]) => (
                                <li key={region.id}>
                                    {joinReactNodes(unitTypes.map((ut, i) => <b key={i}>{ut.name}</b>), ", ")} to <b>{region.name}</b>
                                </li>
                            ))}
                        </ul>}
                    </>
                );

            case "westeros-card-executed":
                const westerosCardType = westerosCardTypes.get(data.westerosCardType);

                return (
                    <>
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WesterosCardComponent cardType={westerosCardType} size="small" tooltip={true} westerosDeckI={data.westerosDeckI}/>
                            </Col>
                        </Row>
                    </>
                );

            case "westeros-cards-drawn":
                const drawnWesterosCardTypes = data.westerosCardTypes.map(wctid => westerosCardTypes.get(wctid));

                return (
                    <>
                        <p>
                            Westeros cards were drawn:
                        </p>
                        <Row className="justify-content-around">
                            {drawnWesterosCardTypes.map((wct, i) => (
                                <Col xs="auto" key={i}>
                                    <WesterosCardComponent cardType={wct} size="small" tooltip={true} westerosDeckI={i} />
                                </Col>
                            ))}
                        </Row>
                        {data.addedWildlingStrength > 0 && (
                            <p>Wildling Threat increased by {data.addedWildlingStrength}</p>
                        )}
                    </>
                );

            case "combat-result":
                const houseCombatDatas = data.stats.map(stat => {
                    const house = this.game.houses.get(stat.house);
                    return {
                        ...stat,
                        house,
                        region: this.world.regions.get(stat.region),
                        houseCard: stat.houseCard != null ? house.houseCards.get(stat.houseCard) : null,
                        armyUnits: stat.armyUnits.map(ut => unitTypes.get(ut))
                    };
                });
                const winner = this.game.houses.get(data.winner);

                return (
                    <>
                        <p>Combat result</p>
                        <CombatInfoComponent housesCombatData={houseCombatDatas}/>
                        <p><b>{winner.name}</b> won the fight!</p>
                    </>
                );
            case "wildling-card-revealed":
                const wildlingCard = this.game.wildlingDeck.find(wc => wc.id == data.wildlingCard) as WildlingCard;

                return (
                    <>
                        Wildling card revealed:
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WildlingCardComponent cardType={wildlingCard.type} size="small" tooltip={true} placement="auto"/>
                            </Col>
                        </Row>
                    </>
                );
            case "wildling-bidding":
                const results: [number, House[]][] = data.results.map(([bid, hids]) => [bid, hids.map(hid => this.game.houses.get(hid))]);

                return (
                    <>
                        Wildling bidding results for Wildling Threat <b>{data.wildlingStrength}</b>:
                        <table cellPadding="5">
                            {results.map(([bid, houses]) => houses.map(h => (
                                <tr key={h.id}>
                                    <td>{h.name}</td>
                                    <td>{bid}</td>
                                </tr>
                            )))}
                        </table>
                        {data.nightsWatchVictory ? (
                            <>The <b>Night&apos;s Watch</b> won!</>
                        ) : (
                            <>The <b>Wildlings</b> won!</>
                        )}
                    </>
                );

            case "lowest-bidder-chosen":
                let lowestBidder = this.game.houses.get(data.lowestBidder);

                return (
                    <>
                        <b>{lowestBidder.name}</b> was chosen as the lowest bidder.
                    </>
                );

            case "highest-bidder-chosen":
                const highestBidder = this.game.houses.get(data.highestBidder);

                return (
                    <>
                        <b>{highestBidder.name}</b> was chosen as the highest bidder.
                    </>
                );

            case "player-mustered":
                house = this.game.houses.get(data.house);
                const musterings = _.flatMap(data.musterings.map(([_, musterements]: [string, {region: string; from: string | null; to: string}[]]) =>
                    musterements.map(({region, from, to}) => ({
                        region: this.game.world.regions.get(region),
                        from: from ? unitTypes.get(from) : null,
                        to: unitTypes.get(to)
                    }))
                ));

                return (
                    <>
                        <p>
                            <b>{house.name}</b> mustered{musterings.length > 0 ? ":" : " nothing."}
                        </p>
                        {musterings.length > 0 && (
                        <ul>
                            {musterings.map(({region, from, to}, i) => (
                                <li key={i}>
                                    {from ? (
                                        <>
                                            A <b>{to.name}</b> from a <b>{from.name}</b> in <b>{region.name}</b>
                                        </>
                                    ) : (
                                        <>A <b>{to.name}</b> in <b>{region.name}</b></>
                                    )}
                                </li>
                            ))}
                        </ul>
                        )}
                    </>
                );

            case "winner-declared":
                return (
                    <>Game ended.</>
                );

            case "raven-holder-wildling-card-put-bottom":
                house = this.game.houses.get(data.ravenHolder);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to look at the top
                        card of the Wildling deck and to move it at the bottom of the deck.
                    </p>
                );

            case "raven-holder-wildling-card-put-top":
                house = this.game.houses.get(data.ravenHolder);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to look at the top
                        card of the Wildling deck and to leave it at the top of the deck.
                    </p>
                );

            case "raven-holder-replace-order":
                house = this.game.houses.get(data.ravenHolder);
                const orderRegion = this.world.regions.get(data.region);
                const originalOrder = orders.get(data.originalOrder);
                const newOrder = orders.get(data.newOrder);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to replace
                        a <b>{originalOrder.type.name} Order</b> with a <b>{newOrder.type.name} Order
                        </b> in <b>{orderRegion.name}</b>.
                    </p>
                );

            case "raven-not-used":{
                const house = this.game.houses.get(data.ravenHolder);

                return <p><b>{house.name}</b> did not use the Messenger Raven token.</p>;
            }

            case "raid-done":
                const raider = this.game.houses.get(data.raider);
                const raiderRegion = this.world.regions.get(data.raiderRegion);
                const raidee = data.raidee ? this.game.houses.get(data.raidee) : null;
                const raidedRegion = data.raidedRegion ? this.world.regions.get(data.raidedRegion) : null;
                const orderRaided = data.orderRaided ? orders.get(data.orderRaided) : null;

                // Those 3 variables will always be all null or all non-null
                if (raidee && raidedRegion && orderRaided) {
                    return (
                        <>
                            <p>
                                <b>{raider.name}</b> raided <b>{raidee.name}</b>&apos;s <b>{orderRaided.type.name} Order
                                </b> in <b>{raidedRegion.name}</b> from <b>{raiderRegion.name}</b>.
                            </p>
                            {data.raiderGainedPowerToken &&
                                <p><b>{raider.name}</b> gained {data.raiderGainedPowerToken ? "a" : "no"} Power Token
                                    from this raid.</p>}
                            {data.raidedHouseLostPowerToken != null
                                && <p><b>{raidee.name}</b> lost {data.raidedHouseLostPowerToken ? "a" : "no"} Power Token
                                    from this raid.</p>}
                        </>
                    );
                } else {
                    return (
                        <p>
                            <b>{raider.name}</b> raided nothing from <b>{raiderRegion.name}</b>.
                        </p>
                    );
                }

            case "a-throne-of-blades-choice":
                house = this.game.houses.get(data.house);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Iron Throne token, chose to
                        {data.choice == 0 ? (
                            <> trigger a Mustering.</>
                        ) : data.choice == 1 ? (
                            <> trigger a Supply.</>
                        ) : (
                            <> trigger nothing.</>
                        )}
                    </p>
                );

            case "dark-wings-dark-words-choice":
                house = this.game.houses.get(data.house);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to
                        {data.choice == 0 ? (
                            <> trigger a Clash of Kings.</>
                        ) : data.choice == 1 ? (
                            <> trigger a Game of Thrones.</>
                        ) : (
                            <> trigger nothing.</>
                        )}
                    </p>
                );

            case "put-to-the-sword-choice":
                house = this.game.houses.get(data.house);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Valyrian Steel Blade token, chose to
                        {data.choice == 0 ? (
                            <> forbid <b>March +1</b> Orders from being played during this Planning Phase.</>
                        ) : data.choice == 1 ? (
                            <> forbid <b>Defense</b> Orders from being played during this Planning Phase.</>
                        ) : (
                            <> forbid nothing.</>
                        )}
                    </p>
                );

            case "winter-is-coming":
                const drawnCardType = westerosCardTypes.get(data.drawnCardType);

                return <>
                    <b>Winter is Coming</b>: The Westeros deck {data.deckIndex + 1} was shuffled and the new Westeros card drawn
                    is <b>{drawnCardType.name}</b>.
                </>;

            case "westeros-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Westeros Phase</b></h5>
                    </Col>
                </Row>;

            case "planning-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Planning Phase</b></h5>
                    </Col>
                </Row>;

            case "action-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Action Phase</b></h5>
                    </Col>
                </Row>;

            case "action-phase-resolve-raid-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><b>Resolve Raid Orders</b></h6>
                    </Col>
                </Row>;

            case "action-phase-resolve-march-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><b>Resolve March Orders</b></h6>
                    </Col>
                </Row>;

            case "action-phase-resolve-consolidate-power-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><b>Resolve Consolidate Power Orders</b></h6>
                    </Col>
                </Row>;

            case "combat-valyrian-sword-used":
                house = this.game.houses.get(data.house);

                return <><b>{house.name}</b> used the <b>Valyrian Steel Blade</b>.</>;

            case "combat-house-card-chosen":
                const houseCards = data.houseCards.map(([hid, hcid]) => {
                    const house = this.game.houses.get(hid);
                    return [house, house.houseCards.get(hcid)];
                });

                return <>
                    <p>House cards were chosen:</p>
                    <ul>
                        {houseCards.map(([h, hc]) => (
                            <li key={h.id}><b>{h.name}</b> chose <b>{hc.name}</b></li>
                        ))}
                    </ul>
                </>;

            case "clash-of-kings-final-ordering":
                const finalOrder = data.finalOrder.map(hid => this.game.houses.get(hid));

                return <>
                    <p>
                        Final order for {this.game.getNameInfluenceTrack(data.trackerI)}: {
                        joinReactNodes(finalOrder.map(h => <b key={h.id}>{h.name}</b>), ", ")}
                    </p>
                </>;

            case "clash-of-kings-bidding-done":
                const bids = _.flatMap(data.results.map(([bid, hids]) => hids.map(hid => [bid, this.game.houses.get(hid)] as [number, House])));

                return <>
                    <p>
                        Houses bid for the {this.game.getNameInfluenceTrack(data.trackerI)}:
                    </p>
                    <ul>
                        {bids.map(([bid, house]) => (
                            <li key={house.id}><b>{house.name}</b> bid <b>{bid}</b></li>
                        ))}
                    </ul>
                </>;

            case "wildling-strength-trigger-wildlings-attack":
                return <>
                    <b>Wildling Threat</b> reached <b>{data.wildlingStrength}</b>, triggering a <b>Wildling Attack</b>
                </>;

            case "march-order-removed":
                house = this.game.houses.get(data.house);
                let region = this.game.world.regions.get(data.region);

                return <>
                    <p>
                        <b>{house.name}</b> removed their March Order in <b>{region.name}</b>.
                    </p>
                </>;

            case "consolidate-power-order-resolved":
                house = this.game.houses.get(data.house);
                region = this.world.regions.get(data.region);
                const countPowerToken = data.powerTokenCount;

                return <>
                    <b>{house.name}</b> resolved a {data.starred && "Special "}Consolidate Power Order
                    in <b>{region.name}</b> to gain <b>{countPowerToken}</b> Power token{countPowerToken > 1 && "s"}.
                </>;

            case "armies-reconciled":
                house = this.game.houses.get(data.house);
                const armies = data.armies.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))] as [Region, UnitType[]]);

                return <>
                    <p>
                        <b>{house.name}</b> reconciled their armies by removing:
                    </p>
                    <ul>
                        {armies.map(([region, unitTypes]) => (
                            <li key={region.id}>{region.name}: {unitTypes.map(ut => ut.name).join(", ")}</li>
                        ))}
                    </ul>
                </>;

            case "house-card-ability-not-used":
                house = this.game.houses.get(data.house);
                let houseCard = this.game.getHouseCardById(data.houseCard);

                return <>
                    <b>{house.name}</b> did not use <b>{houseCard.name}&apos;s</b> ability.
                </>;

            case "patchface-used":
                house = this.game.houses.get(data.house);
                let affectedHouse = this.game.houses.get(data.affectedHouse);
                houseCard = this.game.getHouseCardById(data.houseCard);
                return <>
                    <b>Patchface</b>: <b>{house.name}</b> decided to discard <b>
                        {houseCard.name}</b> from house <b>{affectedHouse.name}</b>.
                </>;

            case "doran-used":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                const influenceTrack = this.game.getNameInfluenceTrack(data.influenceTrack);

                return <>
                    <b>Doran Martell</b>: <b>{house.name}</b> decided to move <b>
                        {affectedHouse.name}</b> to the bottom of the <b>{influenceTrack}</b> track.
                </>;

            case "tyrion-lannister-choice-made":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                const chooseToReplace = data.chooseToReplace;

                return <>
                    <b>Tyrion Lannister</b>: <b>{house.name}</b> {!chooseToReplace && "didn't "}force{chooseToReplace && "d"} <b>
                        {affectedHouse.name}</b> to choose a new House card.
                </>;

            case "tyrion-lannister-house-card-replaced":
                affectedHouse = this.game.houses.get(data.affectedHouse);
                const newHouseCard = data.newHouseCard ? affectedHouse.houseCards.get(data.newHouseCard) : null;

                return newHouseCard ? (
                    <><b>{affectedHouse.name}</b> chose <b>{newHouseCard.name}.</b></>
                ) : (
                    <><b>{affectedHouse.name}</b> had no other available House card</>
                );

            case "arianne-martell-prevent-movement":
                const enemyHouse = this.game.houses.get(data.enemyHouse);

                return <>
                    <b>Arianne Martell</b>: <b>{enemyHouse.name}</b> cannot move their attacking
                    army to the embattled area.
                </>;

            case "roose-bolton-house-cards-returned":
                house = this.game.houses.get(data.house);
                const returnedHouseCards = data.houseCards.map(hcid => house.houseCards.get(hcid));

                return <>
                    <b>Roose Bolton</b>: <b>{house.name}</b> took back all discarded House
                    cards ({joinReactNodes(returnedHouseCards.map(hc => <b key={hc.id}>{hc.name}</b>), ", ")}).
                </>;

            case "loras-tyrell-attack-order-moved":
                const order = orders.get(data.order);
                const embattledRegion = this.world.regions.get(data.region);

                return <>
                    <b>Loras Tyrell</b>: The <b>{order.type.name}</b> Order was moved
                    to <b>{embattledRegion.name}</b>.
                </>;

            case "queen-of-thorns-no-order-available":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);

                return <>
                    <b>Queen of Thorns</b>: <b>{affectedHouse.name}</b> had no adjacent Order tokens.
                </>;

            case "queen-of-thorns-order-removed":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                region = this.world.regions.get(data.region);
                let removedOrder = orders.get(data.orderRemoved);

                return <>
                    <b>Queen of Thorns</b>: <b>{house.name}</b> removed
                    a <b>{removedOrder.type.name}</b> Order of <b>{affectedHouse.name}</b> in <b>{region.name}</b>.
                </>;

            case "tywin-lannister-power-tokens-gained":
                house = this.game.houses.get(data.house);
                const powerTokensGained = data.powerTokensGained;

                return <>
                    <b>Tywin Lannister</b>: <b>{house.name}</b> gained {powerTokensGained} Power
                    tokens.
                </>;

            case "renly-baratheon-no-knight-available":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Renly Baratheon</b>: <b>{house.name}</b> had no available Knight to upgrade to.
                </>;

            case "renly-baratheon-no-footman-available":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Renly Baratheon</b>: <b>{house.name}</b> had no available Footman to upgrade.
                </>;

            case "renly-baratheon-footman-upgraded-to-knight":
                house = this.game.houses.get(data.house);
                region = this.world.regions.get(data.region);

                return <>
                    <b>Renly Baratheon</b>: <b>{house.name}</b> upgraded a Footman to a Knight
                    in <b>{region.name}</b>.
                </>;

            case "mace-tyrell-casualties-prevented":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Mace Tyrell</b>: Casualties were prevented by <b>The Blackfish</b>.
                </>;

            case "mace-tyrell-no-footman-available":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Mace Tyrell</b>: No enemy Footman was available to be killed.
                </>;

            case "mace-tyrell-footman-killed":
                house = this.game.houses.get(data.house);
                region = this.world.regions.get(data.region);

                return <>
                    <b>Mace Tyrell</b>: <b>{house.name}</b> killed an enemy Footman
                    in <b>{region.name}</b>.
                </>;

            case "cersei-lannister-no-order-available":
                return <>
                    <b>Cersei Lannister</b>: There were no Order tokens to be removed.
                </>;

            case "cersei-lannister-order-removed":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                region = this.world.regions.get(data.region);
                removedOrder = orders.get(data.order);

                return <>
                    <b>Cersei Lannister</b>: <b>{house.name}</b> removed
                    a <b>{removedOrder.type.name}</b> Order
                    of <b>{affectedHouse.name}</b> in <b>{region.name}</b>.
                </>;

            case "robb-stark-retreat-location-overriden":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);

                return <>
                    <b>Robb Stark</b>: <b>{house.name}</b> chose the retreat location of the
                    retreating army of <b>{affectedHouse.name}</b>.
                </>;

            case "retreat-region-chosen": {
                const house = this.game.houses.get(data.house);
                const regionFrom = this.game.world.regions.get(data.regionFrom);
                const regionTo = this.game.world.regions.get(data.regionTo);
                return <>
                        <b>{house.name}</b> retreats from <b>
                        {regionFrom.name}</b> to <b>{regionTo.name}</b>.
                </>;
            }
            case "retreat-failed": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);

                return <>{
                    data.isAttacker ?
                        <><b>{house.name}</b> was not able to retreat to <b>{region.name}</b>.</>   :
                        <><b>{house.name}</b> was not able to retreat from <b>{region.name}</b>.</>
                }</>;
            }
            case "retreat-casualties-suffered": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(ut => unitTypes.get(ut).name);
                return <>
                    <p><b>{house.name}</b> suffered casualties from the retreat: <>{joinReactNodes(units.map((unitType, i) => <b key={i}>{unitType}</b>), ', ')}</>.</p>
                </>;
            }
            case "enemy-port-taken": {
                const newController = this.game.houses.get(data.newController);
                const oldController = this.game.houses.get(data.oldController);
                const port = this.world.regions.get(data.port);
                return <>
                    {data.shipCount > 0
                        ? <><b>{newController.name}</b> converted {data.shipCount} ship{data.shipCount == 1 ? "" : "s"} from <b>{oldController.name}</b> in <b>{port.name}</b>.</>
                        : <><b>{newController.name}</b> destroyed all <b>{oldController.name}</b> ships in <b>{port.name}</b>.</>}
                </>;
            }
            case "ships-destroyed-by-empty-castle": {
                const house = this.game.houses.get(data.house);
                const port = this.game.world.regions.get(data.port);
                const castle = this.game.world.regions.get(data.castle);
                return <>
                    <><b>{house.name}</b> lost {data.shipCount} Ship{data.shipCount>1?"s":""} in <b>{port.name}</b> because <b>{castle.name}</b> is empty now.</>
                </>;
            }
            case "silence-at-the-wall-executed":
                return <><b>Silence at the Wall</b>: Nothing happened.</>;

            case "preemptive-raid-choice-done":
                house = this.game.houses.get(data.house);

                if (data.choice == 0) {
                    return <>
                        <b>Preemptive Raid</b>: <b>{house.name}</b> chose to kill 2 of their
                        units.
                    </>;
                } else {
                    return <>
                        <b>Preemptive Raid</b>: <b>{house.name}</b> chose to reduce 2 positions
                        on their highest Influence track.
                    </>;
                }

            case "preemptive-raid-track-reduced":
                const chooser = data.chooser ? this.game.houses.get(data.chooser) : null;
                house = this.game.houses.get(data.house);
                let trackName = this.game.getNameInfluenceTrack(data.trackI);

                if (chooser == null) {
                    return <>
                        <b>{house.name}</b> was reduced 2 positions on the <b>{trackName}</b> track.
                    </>;
                } else {
                    return <>
                        <b>{chooser.name}</b> chose to reduce <b>{house.name}</b> 2 positions
                        on the <b>{trackName}</b> track.
                    </>;
                }

            case "preemptive-raid-units-killed":
                house = this.game.houses.get(data.house);
                let units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))] as [Region, UnitType[]]);

                return <>
                    <b>{house.name}</b>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <>{joinReactNodes(unitTypes.map((ut, i) => <b key={i}>{ut.name}</b>), ", ")} in <b>{region.name}</b></>), " and ")}.</>)
                    : <> had no units to destroy.</>}
                </>;

            case "preemptive-raid-wildlings-attack":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Preemptive Raid</b>: A new Wildlings Attack with
                    strength <b>{data.wildlingStrength}</b> was triggered
                    where <b>{house.name}</b> will not be participating.
                </>;

            case "massing-on-the-milkwater-house-cards-back":
                house = this.game.houses.get(data.house);
                const houseCardsReturned = data.houseCardsReturned.map(hcid => house.houseCards.get(hcid));

                return <>
                    <b>Massing on the Milkwater</b>: <b>{house.name}</b> took
                    back {joinReactNodes(houseCardsReturned.map(hc => <b key={hc.id}>{hc.name}</b>), ", ")}
                </>;

            case "massing-on-the-milkwater-wildling-victory":
                lowestBidder = this.game.houses.get(data.lowestBidder);

                return <>
                    <b>Massing on the Milkwater</b>: <b>{lowestBidder.name}</b> discards all House
                    cards with the highest combat strength, all other houses must discard one House card.
                </>;

            case "massing-on-the-milkwater-house-cards-removed":
                house = this.game.houses.get(data.house);
                const houseCardsUsed = data.houseCardsUsed.map(hcid => house.houseCards.get(hcid));

                return <>
                    {houseCardsUsed.length > 0
                        ? <><b>{house.name}</b> discarded {joinReactNodes(houseCardsUsed.map(hc => <b key={hc.id}>{hc.name}</b>), ", ")}.</>
                        : <><b>{house.name}</b> did not discard a House card.</>}
                </>;

            case "a-king-beyond-the-wall-highest-top-track":
                house = this.game.houses.get(data.house);
                trackName = this.game.getNameInfluenceTrack(data.trackI);

                return <>
                    <b>A King Beyond the Wall</b>: <b>{house.name}</b> chose to move at the top
                    of the <b>{trackName}</b> track.
                </>;

            case "a-king-beyond-the-wall-lowest-reduce-tracks":
                lowestBidder = this.game.houses.get(data.lowestBidder);

                return <>
                    <b>A King Beyond the Wall</b>: <b>{lowestBidder.name}</b> was moved to the
                    bottom of all influence tracks.
                </>;

            case "a-king-beyond-the-wall-house-reduce-track":
                house = this.game.houses.get(data.house);
                trackName = this.game.getNameInfluenceTrack(data.trackI);

                return <>
                    <b>A King Beyond the Wall</b>: <b>{house.name}</b> chose to move at the bottom
                    of the <b>{trackName}</b> influence track.
                </>;

            case "mammoth-riders-destroy-units":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    <b>Mammoth Riders</b>: <b>{house.name}</b>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <>{joinReactNodes(unitTypes.map((ut, i) => <b key={i}>{ut.name}</b>), ", ")} in <b>{region.name}</b></>), ", ")}.</>)
                    : <> had no units to destroy.</>}
                </>;

            case "mammoth-riders-return-card":
                house = this.game.houses.get(data.house);
                houseCard = house.houseCards.get(data.houseCard);

                return <>
                    <b>Mammoth Riders</b>: <b>{house.name}</b> chose to
                    regain <b>{houseCard.name}</b>.
                </>;

            case "the-horde-descends-highest-muster":
                house = this.game.houses.get(data.house);

                return <>
                    <b>The Horde Descends</b>: <b>{house.name}</b> may muster forces in any one
                    Castle or Stronghold they control.
                </>;

            case "the-horde-descends-units-killed":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    <b>The Horde Descends</b>: <b>{house.name}</b>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <>{joinReactNodes(unitTypes.map((ut, i) => <b key={i}>{ut.name}</b>), ", ")} in <b>{region.name}</b></>), ", ")}.</>)
                    : <> had no units to destroy.</>}
                </>;

            case "crow-killers-knights-replaced":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    {units.length > 0
                    ? (<><b>Crow Killers</b>: <b>{house.name}</b> replaced {joinReactNodes(units.map(([region, unitTypes]) => <><b>{unitTypes.length}</b> Knight{unitTypes.length > 1 && "s"} in <b>{region.name}</b></>), ", ")} with Footmen.</>)
                    : (<><b>Crow Killers</b>: <b>{house.name}</b> had no Knights to replace with Footmen.</>)}
                </>;

            case "crow-killers-knights-killed": {
                const house = this.game.houses.get(data.house);
                const units: [Region, UnitType[]][] = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <><b>Crow Killers</b>: <b>{house.name}</b> had to destroy {joinReactNodes(units.map(([region, unitTypes]) => <><b>{unitTypes.length}</b> Knight{unitTypes.length > 1 && "s"} in <b>{region.name}</b></>), ", ")}.</>;
            }

            case "crow-killers-footman-upgraded":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    {units.length > 0
                    ? (<><b>Crow Killers</b>: <b>{house.name}</b> replaced {joinReactNodes(units.map(([region, unitTypes]) => <><b>{unitTypes.length}</b> Footm{unitTypes.length == 1 ? "a" : "e"}n in <b>{region.name}</b></>), ", ")} with Knights.</>)
                    : (<><b>Crow Killers</b>: <b>{house.name}</b> was not able to replace any Footman with Knights.</>)}
                </>;

            case "skinchanger-scout-nights-watch-victory":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Skinchanger Scout</b>: <b>{house.name}</b> gets
                    back <b>{data.powerToken}</b> Power tokens.
                </>;

            case "skinchanger-scout-wildling-victory":
                house = this.game.houses.get(data.house);
                const powerTokensLost = data.powerTokensLost.map(([hid, amount]) => [this.game.houses.get(hid), amount] as [House, number]);

                return <>
                    <p>
                        <b>Skinchanger Scout</b>: <b>{house.name}</b> lost all of their Power
                        tokens, all other houses lost 2 Power tokens.
                    </p>
                    <ul>
                        {powerTokensLost.map(([house, amount]) => (
                            <li key={house.id}><b>{house.name}</b> lost <b>{amount}</b> Power tokens.</li>
                        ))}
                    </ul>
                </>;

            case "rattleshirts-raiders-nights-watch-victory":
                house = this.game.houses.get(data.house);

                return <>
                    <b>Rattleshirt&apos;s Raiders</b>: <b>{house.name}</b> gained one level of supply,
                    and is now at <b>{data.newSupply}</b>.
                </>;

            case "rattleshirts-raiders-wildling-victory":
                lowestBidder = this.game.houses.get(data.lowestBidder);
                const newSupply = data.newSupply.map(([hid, supply]) => [this.game.houses.get(hid), supply] as [House, number]);

                return <>
                    <b>Rattleshirt&apos;s Raiders</b>: <b>{lowestBidder.name}</b> lost 2 levels of supply,
                    all other houses lost 1 levels of supply.
                    <ul>
                        {newSupply.map(([house, supply]) => (
                            <li key={house.id}><b>{house.name}</b> is now at <b>{supply}</b>.</li>
                        ))}
                    </ul>
                </>;

            case "game-of-thrones-power-tokens-gained":
                const gains = data.gains.map(([hid, gain]) => [this.game.houses.get(hid), gain] as [House, number]);

                return <>
                    <ul>
                        {gains.map(([house, gain]) => (
                            <li key={house.id}><b>{house.name}</b> gained <b>{gain}</b> Power tokens.</li>
                        ))}
                    </ul>
                </>;
            case "immediatly-killed-after-combat": {
                const house = this.game.houses.get(data.house);
                const killedBecauseWounded = data.killedBecauseWounded.map(utid => unitTypes.get(utid).name);
                const killedBecauseCantRetreat = data.killedBecauseCantRetreat.map(utid => unitTypes.get(utid).name);
                return <>
                    {killedBecauseWounded.length > 0 && (<><b>{house.name}</b> suffered battle casualties because these units were wounded: <>{joinReactNodes(killedBecauseWounded.map((unitType, i) => <b key={i}>{unitType}</b>), ', ')}</>.</>)}
                    {killedBecauseCantRetreat.length > 0 && (<><b>{house.name}</b> suffered battle casualties because these units can&apos;t retreat: <>{joinReactNodes(killedBecauseCantRetreat.map((unitType, i) => <b key={i}>{unitType}</b>), ', ')}</>.</>)}
                </>;
            }
            case "killed-after-combat": {
                const house = this.game.houses.get(data.house);
                const killed = data.killed.map(utid => unitTypes.get(utid).name);
                return <>
                    <b>{house.name}</b> suffered battle casualties and chose these units to be killed: <>{joinReactNodes(killed.map((unitType, i) => <b key={i}>{unitType}</b>), ', ')}</>.
                </>;
            }
            case "supply-adjusted":
                const supplies: [House, number][] = data.supplies.map(([hid, supply]) => [this.game.houses.get(hid), supply]);

                return (
                <>
                    Supply levels have been adjusted:
                    <table cellPadding="5">
                        {supplies.map(([house, supply]) => (
                            <tr key={house.id}>
                                <td>{house.name}</td>
                                <td>{supply}</td>
                            </tr>))}
                    </table>
                </>);
            case "player-replaced":
                const oldUser = this.props.ingameGameState.entireGame.users.get(data.oldUser);
                const newUser = this.props.ingameGameState.entireGame.users.get(data.newUser);
                house = this.game.houses.get(data.house);

                return (
                    <>
                        <b>{oldUser.name}</b> (<b>{house.name}</b>) was replaced by <b>{newUser.name}</b>.
                    </>
                );
        }
    }
}
