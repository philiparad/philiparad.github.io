#!/usr/bin/env python3
"""Synthetic REA-005 classification tests; not hardware equivalence."""
import importlib.util
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("rea005_audit",HERE/"audit.py")
audit=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
def state(**kwargs):
    return {"screen":"edit","mode":"COMP","input":"","cursor":0,"shift":False,
            "alpha":False,"power":True,"memory":{"M":0},"ans":0,
            "error":"","result":"","insert":True,**kwargs}

class ClassificationTests(unittest.TestCase):
    def test_observed_input(self):
        a=state()
        b=dict(a,input="1",cursor=1)
        row=audit.classify(a,b,"Ready","Ready","1")
        self.assertEqual(row["web_observation"],"OBSERVED_STATE_CHANGE")
        self.assertFalse(row["device_behavior_claim"])
        self.assertEqual(row["native_reference_status"],"UNVERIFIED")
    def test_modifier_only_not_functional_pass(self):
        a=state(shift=True)
        b=dict(a,shift=False)
        self.assertEqual(audit.classify(a,b,"","", "SIN")["web_observation"],
                         "MODIFIER_CONSUMED_WITHOUT_OBSERVED_EFFECT")
    def test_no_effect_not_functional_pass(self):
        a=state()
        self.assertEqual(audit.classify(a,a,"same","same","7")["web_observation"],
                         "NO_OBSERVABLE_EFFECT")
    def test_notification_not_functional_pass(self):
        a=state()
        self.assertEqual(audit.classify(a,a,"","Not available","7")["web_observation"],
                         "NOTICE_ONLY")
    def test_error_state(self):
        a=state()
        b=dict(a,screen="error",error="Syntax ERROR")
        self.assertEqual(audit.classify(a,b,"","Syntax ERROR","EQUAL")["web_observation"],
                         "ERROR_STATE")
    def test_modifier_press_is_toggle_only(self):
        a=state()
        b=dict(a,alpha=True)
        self.assertEqual(audit.classify(a,b,"","", "ALPHA")["web_observation"],
                         "MODIFIER_TOGGLE_ONLY")
    def test_mode_inventory(self):
        self.assertEqual(len(audit.MODES),11)
        self.assertEqual(len(audit.MODIFIERS),3)
        self.assertEqual(audit.EXPECTED_COUNT,1650)
    def test_physical_keys_inventory(self):
        import json
        path=audit.KEY_MANIFEST
        j=json.loads(path.read_text(encoding="utf8"))
        ids=[x["physical_id"] for x in j["keys"]]
        self.assertEqual(len(ids),50)
        self.assertEqual(len(set(ids)),50)

if __name__=="__main__":
    unittest.main()
