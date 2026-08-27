import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

// ============================================================
// REAL-TIME RELIEF FUNDING PANEL
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-uhi7.onrender.com';

// ============================================================
// AXIOS
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// LIVE REFRESH
// ============================================================

const REFRESH_INTERVAL = 30000;

// ============================================================
// DONATION ENDPOINT
// ============================================================

const DONATE_ENDPOINT = '/webhook/donate';

// ============================================================
// SAFE NUMBER
// ============================================================

const getNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

// ============================================================
// CURRENCY FORMAT
// ============================================================

const formatCurrency = (
  value,
  currency = 'INR'
) => {
  const number = getNumber(value);

  if (number === null) {
    return '—';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(number);
  } catch {
    return `${currency} ${number.toLocaleString('en-IN')}`;
  }
};

// ============================================================
// FUNDING PANEL
// ============================================================

const FundingPanel = ({ refreshKey }) => {

  // ==========================================================
  // LIVE DATA
  // ==========================================================

  const [data, setData] = useState(null);

  const [loadingFunds, setLoadingFunds] =
    useState(true);

  const [fundsError, setFundsError] =
    useState('');

  const [lastFetch, setLastFetch] =
    useState(null);

  // ==========================================================
  // DONATION STATE
  // ==========================================================

  const [modalOpen, setModalOpen] =
    useState(false);

  const [amount, setAmount] =
    useState('');

  const [purpose, setPurpose] =
    useState('Medical');

  const [donationLoading, setDonationLoading] =
    useState(false);

  const [donationMessage, setDonationMessage] =
    useState('');

  // ==========================================================
  // FETCH REAL FUNDING DATA
  // ==========================================================

  const fetchFunds = useCallback(
    async () => {

      try {

        setLoadingFunds(true);
        setFundsError('');

        const response =
          await api.get('/funds');

        const apiData =
          response?.data;

        // ------------------------------------------------------
        // DO NOT CREATE DEFAULT/Fake FUNDING DATA
        // ------------------------------------------------------

        if (
          !apiData ||
          typeof apiData !== 'object'
        ) {
          setData(null);

          setFundsError(
            'Live funding data is unavailable.'
          );

          return;
        }

        // ------------------------------------------------------
        // REAL API VALUES ONLY
        // ------------------------------------------------------

        const raised =
          getNumber(apiData.raised);

        const target =
          getNumber(apiData.target);

        const donors =
          getNumber(apiData.donors);

        const apiPercentage =
          getNumber(apiData.percentage);

        // ------------------------------------------------------
        // CALCULATE ONLY WHEN REAL RAISED + TARGET EXIST
        // ------------------------------------------------------

        let percentage = null;

        if (
          apiPercentage !== null
        ) {
          percentage =
            Math.min(
              100,
              Math.max(
                0,
                apiPercentage
              )
            );
        }

        else if (
          raised !== null &&
          target !== null &&
          target > 0
        ) {
          percentage =
            Math.min(
              100,
              Math.max(
                0,
                (raised / target) * 100
              )
            );
        }

        // ------------------------------------------------------
        // STORE REAL DATA
        // ------------------------------------------------------

        setData({
          raised,
          target,
          donors,
          percentage,

          currency:
            apiData.currency ||
            'INR',

          lastUpdated:
            apiData.last_updated ||
            apiData.updated_at ||
            null,

          source:
            apiData.source ||
            'backend',
        });

        setLastFetch(
          new Date()
        );

      } catch (error) {

        console.error(
          'Live funding fetch failed:',
          error
        );

        setData(null);

        setFundsError(
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Live funding data is currently unavailable.'
        );

      } finally {

        setLoadingFunds(false);

      }

    },
    []
  );

  // ==========================================================
  // INITIAL + MANUAL REFRESH
  // ==========================================================

  useEffect(() => {

    fetchFunds();

  }, [
    fetchFunds,
    refreshKey,
  ]);

  // ==========================================================
  // AUTOMATIC LIVE REFRESH
  // ==========================================================

  useEffect(() => {

    const interval =
      setInterval(
        fetchFunds,
        REFRESH_INTERVAL
      );

    return () => {
      clearInterval(interval);
    };

  }, [fetchFunds]);

  // ==========================================================
  // DONATE
  // ==========================================================

  const handleDonate = async () => {

    const donationAmount =
      getNumber(amount);

    if (
      donationAmount === null ||
      donationAmount <= 0
    ) {

      setDonationMessage(
        'Enter a valid donation amount.'
      );

      return;
    }

    try {

      setDonationLoading(true);

      setDonationMessage('');

      const response =
        await api.post(
          DONATE_ENDPOINT,
          {
            amount:
              donationAmount,

            purpose,

            currency:
              data?.currency ||
              'INR',

            created_at:
              new Date().toISOString(),
          }
        );

      // ------------------------------------------------------
      // IMPORTANT:
      // NEVER UPDATE RAISED LOCALLY.
      // FETCH REAL DATABASE VALUE AGAIN.
      // ------------------------------------------------------

      await fetchFunds();

      setAmount('');

      setPurpose('Medical');

      setModalOpen(false);

      setDonationMessage(
        response?.data?.message ||
        'Donation processed successfully.'
      );

    } catch (error) {

      console.error(
        'Donation failed:',
        error
      );

      setDonationMessage(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Donation could not be processed.'
      );

    } finally {

      setDonationLoading(false);

    }
  };

  // ==========================================================
  // CLOSE MODAL
  // ==========================================================

  const closeModal = () => {

    if (donationLoading) {
      return;
    }

    setModalOpen(false);

    setAmount('');

    setPurpose('Medical');

    setDonationMessage('');
  };

  // ==========================================================
  // SAFE LIVE VALUES
  // ==========================================================

  const raised =
    data?.raised ?? null;

  const target =
    data?.target ?? null;

  const donors =
    data?.donors ?? null;

  const percentage =
    data?.percentage ?? null;

  const currency =
    data?.currency || 'INR';

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="funding-panel"
      style={{
        zIndex: 1000,
      }}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="funding-top">

        <div>

          <div className="funding-title">
            Relief Funding
          </div>

          <div className="funding-sub">

            {loadingFunds
              ? 'Fetching live funding data…'

              : target !== null
                ? `Target: ${formatCurrency(
                    target,
                    currency
                  )}`

                : 'Target: —'}

          </div>

        </div>

        <span
          className="badge indigo"
          onClick={() => {

            setDonationMessage('');

            setModalOpen(true);

          }}
          style={{
            cursor: 'pointer',
          }}
        >
          Donate
        </span>

      </div>

      {/* ======================================================
          LIVE STATUS
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 10,
          marginTop: 5,
          color:
            fundsError
              ? '#f87171'
              : '#86efac',
        }}
      >

        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background:
              fundsError
                ? '#ef4444'
                : '#22c55e',
            boxShadow:
              fundsError
                ? 'none'
                : '0 0 8px #22c55e',
          }}
        />

        {loadingFunds
          ? 'UPDATING LIVE DATA'

          : fundsError
            ? 'LIVE DATA UNAVAILABLE'

            : 'LIVE BACKEND DATA'}

      </div>

      {/* ======================================================
          FUNDING PROGRESS
      ====================================================== */}

      <div className="funding-row">

        <span className="funding-3d">
          LIVE
        </span>

        <div
          className="funding-bar"
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >

          <div
            className="funding-bar-fill"
            style={{
              height:
                percentage === null
                  ? '0%'
                  : `${percentage}%`,

              transition:
                'height 0.5s ease',
            }}
          />

        </div>

        <div className="orb">

          <div className="orb-glow" />

          <div className="orb-core" />

        </div>

      </div>

      {/* ======================================================
          REAL RAISED AMOUNT
      ====================================================== */}

      <div className="funds-row">

        <div className="funds-icon">
          💰
        </div>

        <div className="funds-text">

          RAISED:{' '}

          <span className="funds-amount">
            {formatCurrency(
              raised,
              currency
            )}
          </span>

          {' '}

          <span className="funds-pct">

            {percentage !== null
              ? `(${percentage.toFixed(1)}%)`
              : '(—)'}

          </span>

        </div>

      </div>

      {/* ======================================================
          REAL TARGET
      ====================================================== */}

      <div
        style={{
          marginTop: 7,
          fontSize: 10,
          color: '#94a3b8',
        }}
      >

        TARGET:{' '}

        <span
          style={{
            color: '#e2e8f0',
          }}
        >
          {formatCurrency(
            target,
            currency
          )}
        </span>

      </div>

      {/* ======================================================
          REAL DONORS
      ====================================================== */}

      {donors !== null && (

        <div
          style={{
            marginTop: 5,
            fontSize: 10,
            color: '#94a3b8',
          }}
        >
          DONORS:{' '}

          <span
            style={{
              color: '#e2e8f0',
            }}
          >
            {donors.toLocaleString(
              'en-IN'
            )}
          </span>
        </div>

      )}

      {/* ======================================================
          LAST UPDATE
      ====================================================== */}

      {(data?.lastUpdated ||
        lastFetch) && (

        <div
          style={{
            marginTop: 5,
            fontSize: 9,
            color: '#64748b',
          }}
        >

          UPDATED:{' '}

          {data?.lastUpdated
            ? new Date(
                data.lastUpdated
              ).toLocaleString(
                'en-IN'
              )
            : lastFetch
              ? lastFetch.toLocaleTimeString(
                  'en-IN'
                )
              : '—'}

        </div>

      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {fundsError && (

        <div
          style={{
            marginTop: 9,
            padding: 8,
            borderRadius: 6,
            background:
              'rgba(127,29,29,.25)',
            color: '#fca5a5',
            fontSize: 10,
          }}
        >

          {fundsError}

        </div>

      )}

      {/* ======================================================
          DONATION MESSAGE
      ====================================================== */}

      {donationMessage && (

        <div
          style={{
            marginTop: 9,
            padding: 8,
            borderRadius: 6,
            background:
              'rgba(30,41,59,.9)',
            color: '#e2e8f0',
            fontSize: 10,
          }}
        >

          {donationMessage}

        </div>

      )}

      {/* ======================================================
          DONATION MODAL
      ====================================================== */}

      {modalOpen && (

        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={closeModal}
        >

          <div
            style={{
              background: '#0d1424',
              border:
                '1px solid #334155',
              padding: 24,
              borderRadius: 10,
              width: 340,
              maxWidth: '100%',
              color: '#fff',
              boxShadow:
                '0 20px 50px rgba(0,0,0,.45)',
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3
              style={{
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              💰 RELIEF FUND
            </h3>

            <div
              style={{
                marginBottom: 12,
                padding: 9,
                borderRadius: 6,
                background: '#111827',
                color: '#94a3b8',
                fontSize: 11,
              }}
            >
              Donations are processed by
              the backend. The funding total
              is refreshed from live backend
              data after donation.
            </div>

            {/* AMOUNT */}

            <div
              style={{
                marginBottom: 12,
              }}
            >

              <label
                style={{
                  fontSize: 12,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Amount ({currency})
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                placeholder="Enter amount"
                disabled={
                  donationLoading
                }
                style={{
                  width: '100%',
                  padding: 9,
                  background:
                    '#1e293b',
                  border:
                    '1px solid #334155',
                  color: '#fff',
                  borderRadius: 5,
                  boxSizing:
                    'border-box',
                }}
              />

            </div>

            {/* PURPOSE */}

            <div
              style={{
                marginBottom: 14,
              }}
            >

              <label
                style={{
                  fontSize: 12,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Purpose
              </label>

              <select
                value={purpose}
                onChange={(e) =>
                  setPurpose(
                    e.target.value
                  )
                }
                disabled={
                  donationLoading
                }
                style={{
                  width: '100%',
                  padding: 9,
                  background:
                    '#1e293b',
                  border:
                    '1px solid #334155',
                  color: '#fff',
                  borderRadius: 5,
                  boxSizing:
                    'border-box',
                }}
              >

                <option value="Medical">
                  Medical
                </option>

                <option value="Food">
                  Food
                </option>

                <option value="Rescue">
                  Rescue
                </option>

                <option value="Shelter">
                  Shelter
                </option>

              </select>

            </div>

            {/* DONATE */}

            <button
              type="button"
              onClick={
                handleDonate
              }
              disabled={
                donationLoading
              }
              style={{
                width: '100%',
                padding: 10,
                background:
                  donationLoading
                    ? '#64748b'
                    : '#34d399',
                border: 'none',
                color: '#000',
                fontWeight: 'bold',
                borderRadius: 5,
                cursor:
                  donationLoading
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >

              {donationLoading
                ? 'PROCESSING…'
                : 'DONATE'}

            </button>

            {/* CANCEL */}

            <button
              type="button"
              onClick={closeModal}
              disabled={
                donationLoading
              }
              style={{
                width: '100%',
                padding: 9,
                background:
                  'transparent',
                border:
                  '1px solid #334155',
                color: '#94a3b8',
                borderRadius: 5,
                cursor:
                  donationLoading
                    ? 'not-allowed'
                    : 'pointer',
                marginTop: 8,
              }}
            >
              Cancel
            </button>

          </div>

        </div>

      )}

    </div>
  );
};

export default FundingPanel;